"""Legacy catalogue endpoints must enforce the same admin boundary as the portal."""
import unittest
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from app.admin import security
from app.routers import blood_bank_router, organ_bank_router, medicine_catalogue_router

class LegacyAdminAccessTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        for module in (blood_bank_router, organ_bank_router, medicine_catalogue_router): app.include_router(module.router)
        self.app = app
        self.client = TestClient(app)
    def tearDown(self): self.client.close()
    def test_every_management_route_requires_sign_in(self):
        checked = 0
        for template, operations in self.app.openapi()["paths"].items():
            methods = {method.upper() for method in operations} & {"POST", "PUT", "PATCH", "DELETE"}
            if template.endswith("/all"): methods |= {"GET"}
            for method in methods:
                path = template
                for parameter in ("blood_bank_id", "organ_bank_id", "medicine_id"): path = path.replace("{" + parameter + "}", "000000000000000000000001")
                with self.subTest(method=method, path=path):
                    response = self.client.request(method, path, json={})
                    self.assertEqual(response.status_code, 401, response.text)
                checked += 1
        self.assertGreaterEqual(checked, 15)
    def test_ordinary_user_cannot_reach_write_handlers(self):
        for prefix, module, function in [("blood-banks", blood_bank_router, "delete_blood_bank"), ("organ-banks", organ_bank_router, "delete_organ_bank"), ("medicine-catalogue", medicine_catalogue_router, "delete_medicine")]:
            with patch.object(security.auth, "verify_id_token", return_value={"uid": "ordinary-user", "admin": False}), patch.object(module, function, new=AsyncMock(return_value=True)) as mutation:
                response = self.client.delete(f"/api/{prefix}/000000000000000000000001", headers={"Authorization": "Bearer test"})
                self.assertEqual(response.status_code, 403)
                mutation.assert_not_awaited()
    def test_administrator_can_use_legacy_management_routes(self):
        for prefix, module, function, value in [("blood-banks", blood_bank_router, "delete_blood_bank", True), ("organ-banks", organ_bank_router, "delete_organ_bank", True), ("medicine-catalogue", medicine_catalogue_router, "delete_medicine", {"success": True})]:
            with patch.object(security.auth, "verify_id_token", return_value={"uid": "test-admin", "admin": True}), patch.object(module, function, new=AsyncMock(return_value=value)) as mutation:
                response = self.client.delete(f"/api/{prefix}/000000000000000000000001", headers={"Authorization": "Bearer test"})
                self.assertEqual(response.status_code, 200, response.text)
                mutation.assert_awaited_once()
    def test_public_bank_directory_reads_still_work(self):
        for prefix, module, function in [("blood-banks", blood_bank_router, "get_active_blood_banks"), ("organ-banks", organ_bank_router, "get_organ_banks")]:
            with patch.object(module, function, new=AsyncMock(return_value=[])):
                self.assertEqual(self.client.get(f"/api/{prefix}/").status_code, 200)

    def test_ordinary_admin_cannot_mark_medicine_clinically_verified(self):
        medicine = medicine_catalogue_router.MedicineCatalogueCreate.model_construct(name="Synthetic", verified=True, generic_name="Example ingredient", information_source="https://example.org/label")
        with self.assertRaises(HTTPException) as error:
            medicine_catalogue_router.require_review_permission(medicine, {"uid": "ordinary-admin", "admin": True})
        self.assertEqual(error.exception.status_code, 403)
    def test_reviewer_cannot_verify_unsourced_medicine(self):
        medicine = medicine_catalogue_router.MedicineCatalogueCreate.model_construct(name="Synthetic", verified=True, generic_name="Example ingredient", information_source=None)
        with self.assertRaises(HTTPException) as error:
            medicine_catalogue_router.require_review_permission(medicine, {"uid": "reviewer", "admin": True, "clinical_reviewer": True})
        self.assertEqual(error.exception.status_code, 422)
    def test_reviewer_can_verify_sourced_medicine(self):
        medicine = medicine_catalogue_router.MedicineCatalogueCreate.model_construct(name="Synthetic", verified=True, generic_name="Example ingredient", information_source="https://example.org/label")
        medicine_catalogue_router.require_review_permission(medicine, {"uid": "reviewer", "admin": True, "clinical_reviewer": True})
