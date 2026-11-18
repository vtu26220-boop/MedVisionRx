import unittest
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers import users_router as users

class AdminWebsiteProfileTests(unittest.TestCase):
    def setUp(self):
        self.collection=AsyncMock()
        self.collection.find_one.return_value=None
        self.actor={"uid":"admin-profile","email":"medvisionrx@gmail.com","admin":True}
        self.patches=[patch.object(users,"database",{"users":self.collection}),patch.object(users,"verify_firebase_token",side_effect=lambda token:dict(self.actor)),patch.dict("os.environ",{"MEDVISION_ADMIN_UIDS":""})]
        for item in self.patches:item.start()
        app=FastAPI();app.include_router(users.router);self.client=TestClient(app)
        self.headers={"Authorization":"Bearer synthetic"}
    def tearDown(self):
        self.client.close()
        for item in reversed(self.patches):item.stop()
    def test_admin_needs_no_existing_profile_or_phone(self):
        response=self.client.get("/api/users/me",headers=self.headers)
        self.assertEqual(response.status_code,200,response.text)
        profile=response.json()["user"]
        self.assertTrue(profile["is_admin"])
        self.assertEqual(profile["fullName"],"Admin")
        self.assertEqual(profile["phone"],"")
        self.assertEqual(profile["avatarId"],"/admin-avatar.svg")
        self.collection.update_one.assert_not_awaited()
        response=self.client.patch("/api/users/me",headers=self.headers,json={"fullName":"Admin"})
        self.assertEqual(response.status_code,200,response.text)
        self.assertTrue(self.collection.update_one.call_args.kwargs["upsert"])
    def test_email_and_stored_role_cannot_grant_administrator_access(self):
        self.actor.pop("admin")
        self.assertEqual(self.client.get("/api/users/me",headers=self.headers).status_code,404)
        self.collection.find_one.return_value={"uid":self.actor["uid"],"fullName":"Student","is_admin":True,"role":"Administrator"}
        profile=self.client.get("/api/users/me",headers=self.headers).json()["user"]
        self.assertFalse(profile["is_admin"])
        self.assertEqual(profile["role"],"Member")
        response=self.client.patch("/api/users/me",headers=self.headers,json={"fullName":"Student"})
        self.assertEqual(response.status_code,400)
    def test_uid_allowlist_admin_has_same_profile(self):
        self.actor.pop("admin")
        with patch.dict("os.environ",{"MEDVISION_ADMIN_UIDS":"admin-profile"}):
            profile=self.client.get("/api/users/me",headers=self.headers).json()["user"]
        self.assertTrue(profile["is_admin"])
