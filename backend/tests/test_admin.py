import copy
import asyncio
import io
import re
import unittest
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from bson import ObjectId
from fastapi import FastAPI, File, UploadFile
from fastapi.testclient import TestClient

from app.admin import router as admin
from app.admin import security, policy


def matches(row, query):
    for key, value in query.items():
        if key == "$or":
            if not any(matches(row, part) for part in value): return False
        elif isinstance(value, dict):
            current = row
            for piece in key.split("."): current = current.get(piece) if isinstance(current,dict) else None
            if "$in" in value and current not in value["$in"]: return False
            if "$ne" in value and current == value["$ne"]: return False
            if "$regex" in value and not re.search(value["$regex"], str(current or ""), re.I): return False
        else:
            current = row
            for piece in key.split("."): current = current.get(piece) if isinstance(current,dict) else None
            if current != value: return False
    return True


class Cursor:
    def __init__(self, rows): self.rows=copy.deepcopy(rows)
    def sort(self, field, direction=1):
        fields=field if isinstance(field,list) else [(field,direction)]
        for key,order in reversed(fields):
            self.rows.sort(key=lambda row: str(row.get(key, "")), reverse=order<0)
        return self
    def skip(self, count): self.rows=self.rows[count:]; return self
    def limit(self, count): self.rows=self.rows[:count]; return self
    async def to_list(self, length=None): return self.rows if length is None else self.rows[:length]
    def __aiter__(self):
        self.iterator=iter(self.rows)
        return self
    async def __anext__(self):
        try: return next(self.iterator)
        except StopIteration: raise StopAsyncIteration


class Collection:
    def __init__(self): self.rows=[]
    def find(self, query, projection=None):
        rows=[copy.deepcopy(row) for row in self.rows if matches(row,query)]
        if projection:
            rows=[{key:value for key,value in row.items() if projection.get(key) or key=="_id"} for row in rows]
        return Cursor(rows)
    async def find_one(self, query):
        return next((copy.deepcopy(row) for row in self.rows if matches(row,query)),None)
    async def count_documents(self, query): return sum(matches(row,query) for row in self.rows)
    async def insert_one(self, row):
        record=copy.deepcopy(row); record.setdefault("_id",ObjectId()); self.rows.append(record)
        return SimpleNamespace(inserted_id=record["_id"])
    async def update_one(self, query, update, upsert=False):
        for row in self.rows:
            if matches(row,query):
                for path,value in copy.deepcopy(update.get("$set",{})).items():
                    target=row;pieces=path.split('.')
                    for piece in pieces[:-1]:target=target.setdefault(piece,{})
                    target[pieces[-1]]=value
                return SimpleNamespace(matched_count=1)
        if upsert: self.rows.append({**copy.deepcopy(query),**copy.deepcopy(update.get("$set",{}))})
        return SimpleNamespace(matched_count=0)
    def aggregate(self,pipeline):
        counts={}
        group=next(stage['$group'] for stage in pipeline if '$group' in stage)
        bounds=next(stage['$match']['_event_date'] for stage in pipeline if '$match' in stage)
        def evaluate(expr,row):
            if isinstance(expr,str) and expr.startswith('$'):return row.get(expr[1:])
            if not isinstance(expr,dict):return expr
            if '$in' in expr:
                value,options=expr['$in'];return evaluate(value,row) in options
            if '$eq' in expr:
                left,right=expr['$eq'];return evaluate(left,row)==evaluate(right,row)
            if '$cond' in expr:
                condition,yes,no=expr['$cond'];return evaluate(yes if evaluate(condition,row) else no,row)
            raise AssertionError('Unsupported aggregate expression')
        for row in self.rows:
            date=row.get('created_at')
            if not isinstance(date,datetime) or not bounds['$gte']<=date<=bounds['$lte']:continue
            key=date.astimezone(timezone(timedelta(hours=5,minutes=30))).date().isoformat()
            counts.setdefault(key,{'_id':key,**{field:0 for field in group if field!='_id'}})
            for field,expression in group.items():
                if field!='_id':counts[key][field]+=evaluate(expression['$sum'],row)
        return Cursor(list(counts.values()))



class Database:
    def __init__(self): self.collections={}
    def __getitem__(self,key): return self.collections.setdefault(key,Collection())


class AdminTests(unittest.TestCase):
    def setUp(self):
        self.db=Database()
        self.actor={"uid":"admin-uid","email":"admin@example.org","admin":True}
        self.patches=[patch.object(admin,"database",self.db),patch.object(policy,"database",self.db),patch.object(security.auth,"verify_id_token",side_effect=self.verify),patch.dict("os.environ",{"MEDVISION_ADMIN_UIDS":"", "MEDVISION_REVIEWER_UIDS":""})]
        for item in self.patches:item.start()
        policy.invalidate_policy(); policy._cached=None
        self.app=FastAPI(); self.app.add_middleware(policy.AdminPolicyMiddleware); self.app.include_router(admin.router)
        @self.app.get("/api/blood-donors/")
        async def donors(): return {"ok":True}
        @self.app.post("/api/prescription/scan")
        async def upload(file:UploadFile=File(...)): return {"size":len(await file.read())}
        self.client=TestClient(self.app)
        self.headers={"Authorization":"Bearer valid-admin"}
        self.db["users"].rows=[{"_id":ObjectId(),"uid":"user-uid","email":"person@example.org","fullName":"Test User","phone":"1234567890","password_hash":"must-not-leak","profileImageUrl":"secret-image"}]
        self.rxid="synthetic-rx"
        self.db["prescriptions"].rows=[{"_id":self.rxid,"user_id":"user-uid","filename":"synthetic.png","status":"completed","raw_text":"private medical text","medicines":[{"medicine_name":"Private medicine"}],"file_path":"private/file","created_at":datetime.now(timezone.utc)}]
    def verify(self,token,**kwargs):
        if token=="regular": return {"uid":"user-uid","email":"person@example.org"}
        if token=="expired": raise ValueError("expired")
        return dict(self.actor)
    def tearDown(self):
        self.client.close()
        for item in reversed(self.patches):item.stop()
        policy.invalidate_policy();policy._cached=None
    def get(self,path,**kwargs):return self.client.get('/api/admin'+path,headers=self.headers,**kwargs)
    def patch(self,path,body):return self.client.patch('/api/admin'+path,headers=self.headers,json=body)

    def test_website_session_is_admin_only_and_uses_verified_uid(self):
        with patch.object(admin.auth, "create_custom_token", return_value=b"synthetic-bridge-token") as mint:
            denied=self.client.post('/api/admin/website-session',headers={'Authorization':'Bearer regular'})
            self.assertEqual(denied.status_code,403);mint.assert_not_called()
            response=self.client.post('/api/admin/website-session',headers=self.headers,json={'uid':'another-account'})
            self.assertEqual(response.status_code,200,response.text)
            mint.assert_called_once_with('admin-uid')
            self.assertEqual(response.json(),{'uid':'admin-uid','token':'synthetic-bridge-token'})
            self.assertEqual(response.headers['cache-control'],'no-store')
            self.assertNotIn('synthetic-bridge-token',str(self.db['admin_audit'].rows))

    def test_website_session_rejects_email_only_and_hides_signing_failure(self):
        self.actor={'uid':'ordinary','email':'medvisionrx@gmail.com'}
        with patch.object(admin.auth,'create_custom_token') as mint:
            self.assertEqual(self.client.post('/api/admin/website-session',headers=self.headers).status_code,403)
            mint.assert_not_called()
        self.actor={'uid':'admin-uid','admin':True}
        with patch.object(admin.auth,'create_custom_token',side_effect=RuntimeError('private signer detail')):
            response=self.client.post('/api/admin/website-session',headers=self.headers)
            self.assertEqual(response.status_code,503)
            self.assertNotIn('private signer detail',response.text)

    def test_admin_endpoints_reject_ordinary_users_and_missing_auth(self):
        for path in ['/me','/dashboard','/resources/users','/resources/prescriptions','/settings']:
            self.assertEqual(self.client.get('/api/admin'+path).status_code,401)
            self.assertEqual(self.client.get('/api/admin'+path,headers={'Authorization':'Bearer regular'}).status_code,403)
        self.assertEqual(self.client.get('/api/admin/me',headers={'Authorization':'Bearer expired'}).status_code,401)
    def test_backend_identity_does_not_trust_email_alone(self):
        self.actor={'uid':'ordinary','email':'medvisionrx@gmail.com'}
        self.assertEqual(self.get('/me').status_code,403)
    def test_dashboard_uses_real_database_counts_and_zeroes(self):
        response=self.get('/dashboard?days=7');self.assertEqual(response.status_code,200,response.text)
        data=response.json();self.assertEqual(data['totals']['users'],1);self.assertEqual(data['totals']['analyzed'],1)
        self.assertEqual(data['totals']['active_requirements'],0);self.assertEqual(len(data['chart']),7)
        self.assertEqual(data['activity'],[])
    def test_finished_analysis_counts_include_optional_review_state(self):
        now=datetime.now(timezone.utc)
        self.db['prescriptions'].rows=[{'_id':str(i),'status':status,'created_at':now} for i,status in enumerate(['needs_review','needs_review','completed','failed','processing'])]
        response=self.get('/dashboard?days=7')
        self.assertEqual(response.status_code,200,response.text)
        data=response.json()
        self.assertEqual(data['totals']['prescriptions'],5)
        self.assertEqual(data['totals']['analyzed'],3)
        self.assertEqual(data['totals']['scans_failed'],1)
        self.assertEqual(sum(point['analyzed'] for point in data['chart']),3)
        self.assertEqual(sum(point['failed'] for point in data['chart']),1)

    def test_analyzed_filter_includes_both_finished_states(self):
        self.db['prescriptions'].rows=[{'_id':str(i),'status':status} for i,status in enumerate(['needs_review','completed','failed','processing'])]
        data=self.get('/resources/prescriptions?status=analyzed').json()
        self.assertEqual(data['total'],2)
        self.assertEqual({row['status'] for row in data['items']},{'needs_review','completed'})

    def maintenance_payload(self):
        return {**copy.deepcopy(policy.DEFAULTS),'reason':'Scheduled maintenance control update'}

    def test_public_maintenance_status_available_during_global_maintenance(self):
        body=self.maintenance_payload();body.update(maintenance=True,maintenance_reason='Public upgrade notice',support_email='private@example.org')
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=body).status_code,200)
        response=self.client.get('/api/admin/maintenance-status')
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(set(response.json()),{'website','services','server_time'})
        self.assertTrue(response.json()['website']['enabled'])
        self.assertEqual(response.json()['website']['reason'],'Public upgrade notice')
        self.assertEqual(response.headers['cache-control'],'no-store')
        self.assertNotIn('private@example.org',response.text)
        self.assertEqual(self.client.get('/api/blood-donors/').status_code,503)
        self.assertEqual(self.get('/settings').status_code,200)
        self.assertEqual(self.client.get('/api/admin/settings').status_code,401)

    def test_only_selected_service_is_paused(self):
        body=self.maintenance_payload()
        body['service_maintenance']={'blood_donation':{'enabled':True,'reason':'Blood donation update','ends_at':None}}
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=body).status_code,200)
        state=self.client.get('/api/admin/maintenance-status').json()
        self.assertFalse(state['website']['enabled'])
        self.assertTrue(state['services']['blood_donation']['enabled'])
        self.assertFalse(state['services']['prescription']['enabled'])
        self.assertEqual(self.client.get('/api/blood-donors/').status_code,503)
        self.assertNotEqual(self.client.get('/api/medicine-catalogue/').status_code,503)

    def test_schedule_expiry_reopens_service_and_persists_off_from_cache(self):
        deadline=datetime.now(timezone.utc)+timedelta(hours=1)
        body=self.maintenance_payload()
        body['service_maintenance']={'blood_donation':{'enabled':True,'reason':'Timed upgrade','ends_at':deadline.isoformat()}}
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=body).status_code,200)
        self.assertTrue(self.client.get('/api/admin/maintenance-status').json()['services']['blood_donation']['enabled'])
        class Clock(datetime):
            @classmethod
            def now(cls,tz=None):return deadline+timedelta(seconds=1)
        with patch('app.admin.maintenance.datetime',Clock):
            self.assertFalse(self.client.get('/api/admin/maintenance-status').json()['services']['blood_donation']['enabled'])
            self.assertEqual(self.client.get('/api/blood-donors/').status_code,200)
            self.assertFalse(self.get('/settings').json()['service_maintenance']['blood_donation']['enabled'])
        stored=self.db['admin_settings'].rows[0]
        self.assertFalse(stored['service_maintenance']['blood_donation']['enabled'])
        self.assertTrue(stored['services']['blood_donation'])

    def test_global_expiry_does_not_clear_independent_service_maintenance(self):
        deadline=(datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat()
        self.db['admin_settings'].rows=[{'_id':'platform','maintenance':True,'maintenance_ends_at':deadline,'service_maintenance':{'blood_donation':{'enabled':True,'reason':'Separate update','ends_at':None}}}]
        state=self.client.get('/api/admin/maintenance-status').json()
        self.assertFalse(state['website']['enabled'])
        self.assertTrue(state['services']['blood_donation']['enabled'])
        self.assertEqual(self.client.get('/api/blood-donors/').status_code,503)
        self.assertFalse(self.db['admin_settings'].rows[0]['maintenance'])

    def test_expiry_does_not_override_a_concurrently_extended_schedule(self):
        past=(datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat()
        future=(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat()
        self.db['admin_settings'].rows=[{'_id':'platform','maintenance':True,'maintenance_ends_at':future}]
        stale=policy.normalize({'maintenance':True,'maintenance_ends_at':past},policy.DEFAULTS)
        policy._cached=(stale,set());policy._expires=float('inf')
        data=self.client.get('/api/admin/maintenance-status').json()
        self.assertTrue(data['website']['enabled'])
        self.assertEqual(data['website']['ends_at'],future)
        self.assertTrue(self.db['admin_settings'].rows[0]['maintenance'])

    def test_manual_maintenance_has_no_auto_expiry(self):
        body=self.maintenance_payload();body.update(maintenance=True,maintenance_reason='Manual upgrade')
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=body).status_code,200)
        result=self.client.get('/api/admin/maintenance-status').json()['website']
        self.assertTrue(result['enabled']);self.assertIsNone(result['ends_at'])
        body['maintenance']=False
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=body).status_code,200)
        self.assertFalse(self.client.get('/api/admin/maintenance-status').json()['website']['enabled'])

    def test_invalid_schedule_or_unknown_service_is_rejected(self):
        body=self.maintenance_payload();body.update(maintenance=True,maintenance_ends_at=(datetime.now(timezone.utc)-timedelta(minutes=1)).isoformat())
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=body).status_code,422)
        body=self.maintenance_payload();body['service_maintenance']={'unknown':{'enabled':True,'reason':'Unknown service'}}
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=body).status_code,422)
        body=self.maintenance_payload();body['service_maintenance']={'prescription':{'enabled':True,'reason':''}}
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=body).status_code,422)
        body=self.maintenance_payload();body.update(maintenance=True,maintenance_ends_at='2030-01-01T10:00:00')
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=body).status_code,422)

    def support_ticket(self,service='prescription'):
        response=self.client.post('/api/admin/support/request',headers={'Authorization':'Bearer regular'},json={'name':'Synthetic User','email':'user@example.org','subject':'Upload question','message':'Please help with this upload.','service':service})
        self.assertEqual(response.status_code,201,response.text)
        return response.json()['id']

    def support_reply(self,ticket,request_id=None,message='Your support request has been checked.'):
        response=self.client.post(f'/api/admin/support/{ticket}/respond',headers=self.headers,json={'request_id':request_id or str(uuid4()),'message':message})
        self.assertEqual(response.status_code,200,response.text)
        return response.json()['item']

    def user_notifications(self,service='prescription'):
        response=self.client.get('/api/admin/support/notifications?service='+service,headers={'Authorization':'Bearer regular'})
        self.assertEqual(response.status_code,200,response.text)
        return response.json()

    def notification_action(self,identifier,action):
        return self.client.patch('/api/admin/support/notifications/'+identifier,headers={'Authorization':'Bearer regular'},json={'action':action})

    def test_support_response_delivered_to_original_owner_and_exact_service(self):
        prescription=self.support_ticket();blood=self.support_ticket('blood_donation')
        first=self.support_reply(prescription);self.support_reply(blood)
        data=self.user_notifications()
        self.assertEqual(data['unread_count'],1)
        self.assertEqual([item['id'] for item in data['items']],[first['id']])
        self.assertEqual(data['items'][0]['request_message'],'Please help with this upload.')
        self.assertNotIn('responded_by',data['items'][0])
        self.assertNotIn('user_id',data['items'][0])
        self.assertEqual(len(self.user_notifications('blood_donation')['items']),1)
        self.assertEqual(self.user_notifications('organ_donation')['items'],[])
        self.assertEqual(self.get('/support/notifications?service=prescription').json()['items'],[])

    def test_each_service_receives_only_its_own_support_responses(self):
        services=['prescription','medicine','blood_donation','blood_requirement','organ_donation','organ_requirement']
        for service in services:self.support_reply(self.support_ticket(service),message='Response for '+service)
        for service in services:
            result=self.user_notifications(service)
            self.assertEqual(result['unread_count'],1)
            self.assertEqual([item['service'] for item in result['items']],[service])
        self.assertEqual(self.user_notifications('general')['items'],[])

    def test_support_response_and_admin_history_require_admin(self):
        ticket=self.support_ticket()
        response=self.client.post(f'/api/admin/support/{ticket}/respond',headers={'Authorization':'Bearer regular'},json={'request_id':str(uuid4()),'message':'Forged admin response'})
        self.assertEqual(response.status_code,403)
        self.assertEqual(self.client.get(f'/api/admin/support/{ticket}/responses',headers={'Authorization':'Bearer regular'}).status_code,403)
        self.assertEqual(self.client.get('/api/admin/support/notifications?service=prescription').status_code,401)

    def test_read_and_feedback_reach_admin_and_preserve_first_read_time(self):
        ticket=self.support_ticket();reply=self.support_reply(ticket)
        self.assertEqual(self.notification_action(reply['id'],'read').status_code,200)
        first=self.user_notifications()['items'][0]['read_at']
        self.assertIsNotNone(first)
        self.assertEqual(self.user_notifications()['unread_count'],0)
        self.assertEqual(self.notification_action(reply['id'],'helpful').status_code,200)
        summary=self.get('/resources/support').json()['items'][0]
        self.assertTrue(summary['user_read']);self.assertEqual(summary['user_feedback'],'helpful')
        self.assertEqual(self.notification_action(reply['id'],'not_helpful').status_code,200)
        summary=self.get('/resources/support').json()['items'][0]
        self.assertEqual(summary['user_feedback'],'not_helpful')
        self.assertEqual(self.user_notifications()['items'][0]['read_at'],first)

    def test_notification_actions_cannot_modify_another_users_response(self):
        ticket=self.support_ticket();reply=self.support_reply(ticket)
        for action in ['read','clear','helpful','not_helpful']:
            result=self.client.patch('/api/admin/support/notifications/'+reply['id'],headers=self.headers,json={'action':action,'user_id':'user-uid'})
            self.assertEqual(result.status_code,404)
        data=self.user_notifications()
        self.assertEqual(data['unread_count'],1);self.assertIsNone(data['items'][0]['feedback'])

    def test_clear_hides_notification_but_retains_admin_conversation_and_feedback(self):
        ticket=self.support_ticket();reply=self.support_reply(ticket)
        self.assertEqual(self.notification_action(reply['id'],'helpful').status_code,200)
        self.assertEqual(self.notification_action(reply['id'],'clear').status_code,200)
        self.assertEqual(self.notification_action(reply['id'],'clear').status_code,200)
        self.assertEqual(self.user_notifications(),{'items':[],'unread_count':0})
        history=self.get(f'/support/{ticket}/responses').json()['items']
        self.assertEqual(len(history),1);self.assertEqual(history[0]['feedback'],'helpful');self.assertIsNotNone(history[0]['cleared_at'])
        self.assertEqual(self.notification_action(reply['id'],'not_helpful').status_code,409)
        self.assertEqual(len(self.db['admin_support'].rows),1)

    def test_new_response_is_unread_after_previous_response_was_cleared(self):
        ticket=self.support_ticket();first=self.support_reply(ticket)
        self.notification_action(first['id'],'clear')
        second=self.support_reply(ticket,message='Here is a further update.')
        data=self.user_notifications()
        self.assertEqual(data['unread_count'],1);self.assertEqual(data['items'][0]['id'],second['id']);self.assertIsNone(data['items'][0]['read_at'])
        summary=self.get('/resources/support').json()['items'][0]
        self.assertEqual(summary['response_count'],2);self.assertFalse(summary['user_read'])

    def test_response_retry_does_not_create_duplicate_notifications(self):
        ticket=self.support_ticket();request_id=str(uuid4())
        first=self.support_reply(ticket,request_id);second=self.support_reply(ticket,request_id)
        self.assertEqual(first['id'],second['id'])
        self.assertEqual(self.user_notifications()['unread_count'],1)
        self.assertEqual(len(self.db['admin_support_responses'].rows),1)
        result=self.client.post(f'/api/admin/support/{ticket}/respond',headers=self.headers,json={'request_id':request_id,'message':'Different response'})
        self.assertEqual(result.status_code,409)

    def test_response_recipient_and_service_cannot_be_overridden(self):
        ticket=self.support_ticket()
        result=self.client.post(f'/api/admin/support/{ticket}/respond',headers=self.headers,json={'request_id':str(uuid4()),'message':'Owner-only response','user_id':'attacker','service':'organ_requirement'})
        self.assertEqual(result.status_code,200)
        self.assertEqual(self.user_notifications()['unread_count'],1)
        self.assertEqual(self.user_notifications('organ_requirement')['items'],[])

    def test_reply_validation_and_ownerless_legacy_ticket(self):
        ticket=self.support_ticket()
        for message in ['','   ','x'*4001]:
            result=self.client.post(f'/api/admin/support/{ticket}/respond',headers=self.headers,json={'request_id':str(uuid4()),'message':message})
            self.assertEqual(result.status_code,422)
        self.db['admin_support'].rows.append({'_id':'legacy-ticket','email':'user@example.org'})
        result=self.client.post('/api/admin/support/legacy-ticket/respond',headers=self.headers,json={'request_id':str(uuid4()),'message':'Cannot guess user from email'})
        self.assertEqual(result.status_code,409)

    def test_medicine_total_includes_reviewed_and_unreviewed_records(self):
        self.db['medicine_catalogue'].rows=[{'_id':ObjectId(),'verified':True},{'_id':ObjectId(),'verified':False},{'_id':ObjectId()}]
        totals=self.get('/dashboard?days=7').json()['totals']
        self.assertEqual(totals['medicines'],3)
        self.assertEqual(totals['medicine_pending'],2)
    def test_summaries_do_not_leak_clinical_or_authentication_data(self):
        for resource in ['users','prescriptions']:
            response=self.get('/resources/'+resource);self.assertEqual(response.status_code,200)
            text=response.text
            for secret in ['private medical text','Private medicine','private/file','must-not-leak','secret-image']:self.assertNotIn(secret,text)
    def test_search_escapes_regex_and_paginates(self):
        self.assertEqual(self.get('/resources/users?q=.*').json()['total'],0)
        self.assertEqual(self.get('/resources/users?size=1').json()['total'],1)
        self.assertEqual(self.get('/resources/users?page=2&size=1').json()['items'],[])
    def test_unknown_resource_cannot_query_arbitrary_collection(self):
        self.assertEqual(self.get('/resources/firebase-service-account').status_code,404)
    def test_admin_banks_are_read_by_the_existing_service_queries(self):
        from app.services import blood_bank_service, organ_bank_service
        bank={'name':'Synthetic Test Bank','address':'Test address only','city':'Test City','state':'Test State','phone':'1234567890','is_active':True,'latitude':12.5,'longitude':78.5}
        for resource, extra in [('blood-banks',{'available_blood_groups':['A+','O+']}),('organ-banks',{'type':'Organ and tissue bank','services':['Kidney support']})]:
            response=self.client.post('/api/admin/resources/'+resource,headers=self.headers,json={'values':{**bank,**extra},'reason':'Test shared bank collection integration'})
            self.assertEqual(response.status_code,200,response.text)
            identifier=response.json()['id']
            if resource=='blood-banks':
                with patch.object(blood_bank_service,'blood_banks_collection',self.db['blood_banks']):
                    visible=asyncio.run(blood_bank_service.get_active_blood_banks())
            else:
                with patch.object(organ_bank_service,'organ_banks_collection',self.db['organ_banks']):
                    visible=asyncio.run(organ_bank_service.get_organ_banks())
            self.assertTrue(any(row.get('id',str(row.get('_id','')))==identifier for row in visible))
            edit=self.patch('/resources/'+resource+'/'+identifier,{'values':{'is_active':False},'reason':'Test deactivating shared bank record'})
            self.assertEqual(edit.status_code,200,edit.text)
            if resource=='blood-banks':
                with patch.object(blood_bank_service,'blood_banks_collection',self.db['blood_banks']):
                    visible=asyncio.run(blood_bank_service.get_active_blood_banks())
            else:
                with patch.object(organ_bank_service,'organ_banks_collection',self.db['organ_banks']):
                    visible=asyncio.run(organ_bank_service.get_organ_banks())
            self.assertEqual(visible,[])
    def test_audit_entries_are_not_editable(self):
        response=self.patch('/resources/activity/anything',{'values':{'outcome':'success'},'reason':'hide action'})
        self.assertEqual(response.status_code,405)
    def test_nonreviewer_cannot_view_original_or_clinical_data(self):
        for suffix in ['original','clinical-access']:
            response=self.client.post(f'/api/admin/prescriptions/{self.rxid}/{suffix}',headers=self.headers,json={'reason':'Review support request'})
            self.assertEqual(response.status_code,403)
    def test_clinical_access_requires_reason_and_is_logged(self):
        self.actor['clinical_reviewer']=True
        url=f'/api/admin/prescriptions/{self.rxid}/clinical-access'
        self.assertEqual(self.client.post(url,headers=self.headers,json={'reason':''}).status_code,422)
        response=self.client.post(url,headers=self.headers,json={'reason':'Authorized review of reported issue'})
        self.assertEqual(response.status_code,200);self.assertEqual(response.json()['raw_text'],'private medical text')
        self.assertEqual(self.db['admin_audit'].rows[-1]['action'],'prescription_clinical_access')
    def test_medicine_verification_requires_reviewer_and_source(self):
        body={'values':{'name':'Synthetic medicine','generic_name':'Synthetic ingredient','verified':True,'information_source':'https://example.org/label'},'reason':'New catalogue entry'}
        self.assertEqual(self.client.post('/api/admin/resources/medicines',headers=self.headers,json=body).status_code,403)
        self.actor['clinical_reviewer']=True
        body['values']['information_source']=None
        self.assertEqual(self.client.post('/api/admin/resources/medicines',headers=self.headers,json=body).status_code,422)
        body['values']['information_source']='https://example.org/label'
        response=self.client.post('/api/admin/resources/medicines',headers=self.headers,json=body)
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(self.db['admin_audit'].rows[-1]['outcome'],'success')
    def test_requirement_cannot_be_invented_as_fulfilled(self):
        identifier=ObjectId();self.db['blood_requirements'].rows=[{'_id':identifier,'status':'active'}]
        url='/resources/blood-requirements/'+str(identifier)
        self.assertEqual(self.patch(url,{'values':{'status':'fulfilled'},'reason':'Unsupported fulfillment'}).status_code,409)
        self.assertEqual(self.patch(url,{'values':{'status':'cancelled'},'reason':'Requester reported duplicate'}).status_code,200)
        self.assertEqual(self.db['blood_requirements'].rows[0]['status'],'cancelled')
    def test_mutation_rejects_unsupported_fields(self):
        self.assertEqual(self.patch('/resources/prescriptions/'+self.rxid,{'values':{'user_id':'attacker'},'reason':'Attempted reassignment'}).status_code,422)
    def test_reason_cannot_be_only_spaces(self):
        self.assertEqual(self.patch('/resources/prescriptions/'+self.rxid,{'values':{'admin_flagged':True},'reason':'        '}).status_code,422)
    def test_request_with_donor_activity_cannot_be_cancelled_as_a_simple_edit(self):
        identifier=ObjectId()
        self.db['organ_requirements'].rows=[{'_id':identifier,'status':'active','donor_responses':[{'status':'accepted'}]}]
        result=self.patch('/resources/organ-requirements/'+str(identifier),{'values':{'status':'cancelled'},'reason':'Attempt cancellation with donor activity'})
        self.assertEqual(result.status_code,409)
        self.assertEqual(self.db['organ_requirements'].rows[0]['status'],'active')
    def test_failed_mutation_is_audited_without_false_success(self):
        identifier=ObjectId()
        self.db['blood_donors'].rows=[{'_id':identifier,'availability':True}]
        with patch.object(self.db['blood_donors'],'update_one',side_effect=RuntimeError('database write failed')):
            with self.assertRaises(RuntimeError):
                self.patch('/resources/blood-donors/'+str(identifier),{'values':{'availability':False},'reason':'Test failed mutation recording'})
        self.assertEqual(self.db['admin_audit'].rows[-1]['outcome'],'failed')
    def test_support_ticket_stored_and_resolved(self):
        response=self.client.post('/api/admin/support/request',headers=self.headers,json={'subject':'Synthetic request','message':'This is a test request','email':'person@example.org','service':'general'})
        self.assertEqual(response.status_code,201,response.text)
        identifier=response.json()['id']
        result=self.patch('/resources/support/'+identifier,{'values':{'status':'resolved','resolution':'Resolved in test'},'reason':'Confirmed issue is resolved'})
        self.assertEqual(result.status_code,200)
        self.assertEqual(self.db['admin_support'].rows[0]['status'],'resolved')
    def test_all_service_contact_forms_can_submit_as_normal_users(self):
        headers={'Authorization':'Bearer regular'}
        for service in ['blood_donation','blood_requirement','organ_donation','organ_requirement','medicine','prescription']:
            response=self.client.post('/api/admin/support/request',headers=headers,json={'name':'Contact Test','subject':'Service contact test','message':'Please help with this service.','email':'person@example.org','service':service})
            self.assertEqual(response.status_code,201,response.text)
        rows=self.get('/resources/support').json()['items']
        self.assertEqual(len(rows),6)
        self.assertEqual({row['service'] for row in rows},{'blood_donation','blood_requirement','organ_donation','organ_requirement','medicine','prescription'})
        self.assertTrue(all(row['name']=='Contact Test' and row['status']=='open' for row in rows))
        self.assertTrue(all(row['created_by']=='user-uid' for row in rows))
        self.assertEqual(self.client.get('/api/admin/resources/support',headers=headers).status_code,403)
    def test_contact_submission_requires_sign_in_and_rejects_unknown_service(self):
        payload={'subject':'Contact test','message':'Please help me','email':'person@example.org','service':'prescription'}
        self.assertEqual(self.client.post('/api/admin/support/request',json=payload).status_code,401)
        payload['service']='unsupported-service'
        self.assertEqual(self.client.post('/api/admin/support/request',headers=self.headers,json=payload).status_code,422)
    def test_settings_are_validated_and_enforced_without_service_changes(self):
        settings={**policy.DEFAULTS,'services':{**policy.DEFAULTS['services'],'blood_donation':False},'reason':'Pause this service for maintenance'}
        response=self.client.put('/api/admin/settings',headers=self.headers,json=settings)
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(self.client.get('/api/blood-donors/').status_code,503)
        self.assertEqual(self.get('/me').status_code,200)
        settings['upload_limit_mb']=99
        self.assertEqual(self.client.put('/api/admin/settings',headers=self.headers,json=settings).status_code,422)
    def test_suspended_existing_token_is_blocked_by_policy(self):
        self.db['admin_account_controls'].rows=[{'_id':'user-uid','disabled':True}]
        with patch.object(policy,'verify_firebase_token',return_value={'uid':'user-uid'}):
            response=self.client.get('/api/blood-donors/',headers={'Authorization':'Bearer regular'})
        self.assertEqual(response.status_code,403)
    def test_account_self_suspension_rejected(self):
        response=self.patch('/accounts/admin-uid',{'disabled':True,'reason':'Attempt self suspension'})
        self.assertEqual(response.status_code,409)
    def test_reduced_upload_limit_preserves_valid_multipart_body(self):
        self.db['admin_settings'].rows=[{'_id':'platform','upload_limit_mb':1}]
        response=self.client.post('/api/prescription/scan',files={'file':('test.png',b'test data')})
        self.assertEqual(response.status_code,200,response.text);self.assertEqual(response.json()['size'],9)
        response=self.client.post('/api/prescription/scan',files={'file':('large.png',b'x'*(1024*1024+1))})
        self.assertEqual(response.status_code,413)


if __name__=='__main__':unittest.main()
