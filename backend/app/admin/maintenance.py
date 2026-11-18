"""Maintenance schedules shared by admin controls, API policy and public gates."""
from copy import deepcopy
from datetime import datetime, timezone


def end_time(value):
    if not value:return None
    try:
        result=datetime.fromisoformat(value.replace('Z','+00:00')) if isinstance(value,str) else value
        return result if result.tzinfo is not None else None
    except (ValueError,TypeError,AttributeError):return None


def normalize(settings,defaults):
    result={**deepcopy(defaults),**deepcopy(settings)}
    result['services']={**defaults['services'],**settings.get('services',{})}
    stored=settings.get('service_maintenance',{})
    result['service_maintenance']={key:{'enabled':not result['services'][key],'reason':('This service is temporarily under maintenance.' if not result['services'][key] else ''),'ends_at':None,**stored.get(key,{})} for key in defaults['services']}
    return result


def expired_updates(settings,now=None):
    now=now or datetime.now(timezone.utc)
    changes=[]
    if settings.get('maintenance') and (end:=end_time(settings.get('maintenance_ends_at'))) and end<=now:
        changes.append(({'maintenance':True,'maintenance_ends_at':settings['maintenance_ends_at']},{'maintenance':False}))
    for key,rule in settings.get('service_maintenance',{}).items():
        if rule.get('enabled') and (end:=end_time(rule.get('ends_at'))) and end<=now:
            base=f'service_maintenance.{key}'
            changes.append(({f'{base}.enabled':True,f'{base}.ends_at':rule['ends_at']},{f'{base}.enabled':False,f'services.{key}':True}))
    return changes


def apply_changes(settings,changes):
    result=deepcopy(settings)
    for _,updates in changes:
        for path,value in updates.items():
            target=result
            pieces=path.split('.')
            for piece in pieces[:-1]:target=target[piece]
            target[pieces[-1]]=value
    return result


def public_status(settings):
    def rule(enabled,reason,ends):
        return {'enabled':bool(enabled),'reason':reason or 'Scheduled system updates and performance improvements.','ends_at':ends}
    return {'website':rule(settings.get('maintenance'),settings.get('maintenance_reason'),settings.get('maintenance_ends_at')),
            'services':{key:rule(value['enabled'],value.get('reason'),value.get('ends_at')) for key,value in settings['service_maintenance'].items()},
            'server_time':datetime.now(timezone.utc).isoformat()}
