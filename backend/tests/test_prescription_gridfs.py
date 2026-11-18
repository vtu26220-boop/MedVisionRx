"""Atlas storage tests use in-memory fakes, never the real database."""
import copy
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from bson import ObjectId
from fastapi import HTTPException
from gridfs.errors import NoFile

from app.services import prescription_storage as storage
from app.services import prescription_service as service
import test_prescription_workflow as workflow
image_bytes = workflow.image_bytes


class Bucket:
    def __init__(self): self.files = {}
    async def upload_from_stream(self, filename, content, metadata):
        identifier = ObjectId()
        self.files[identifier] = (bytes(content), copy.deepcopy(metadata))
        return identifier
    async def open_download_stream(self, identifier):
        if identifier not in self.files: raise NoFile("Missing synthetic file")
        content, metadata = self.files[identifier]
        return SimpleNamespace(metadata=copy.deepcopy(metadata), length=len(content), read=AsyncMock(return_value=content))
    async def delete(self, identifier): self.files.pop(identifier, None)


class GridFSWorkflowTests(unittest.TestCase):
    # Reuse existing isolated fixtures; default local tests remain independent.
    upload = workflow.PrescriptionWorkflowTests.upload
    def setUp(self):
        workflow.PrescriptionWorkflowTests.setUp(self)
        self.bucket = Bucket()
        for item in [patch.dict(os.environ, {"PRESCRIPTION_STORAGE": "gridfs"}), patch.object(storage, "bucket", return_value=self.bucket)]:
            item.start(); self.patches.append(item)
    tearDown = workflow.PrescriptionWorkflowTests.tearDown

    def test_upload_survives_lost_local_directory_and_hides_storage_identifiers(self):
        row = self.upload()
        self.assertNotIn("storage_file_id", row)
        self.assertNotIn("storage_provider", row)
        self.assertNotIn("file_path", row)
        self.assertEqual(list(self.storage.iterdir()), [])
        document = self.collection.rows[row["id"]]
        self.assertTrue(document["storage_file_id"])
        response = self.client.get(f'/api/prescription/{row["id"]}/original')
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.content, image_bytes())
        self.assertEqual(response.headers["cache-control"], "private, no-store")
        self.assertEqual(response.headers["content-type"], "image/png")
        # Ownership remains enforced even when the client knows the report ID.
        from app.routers import prescription_router as api
        self.app.dependency_overrides[api.current_user] = lambda: "bob"
        self.assertEqual(self.client.get(f'/api/prescription/{row["id"]}/original').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/prescription/{row["id"]}').status_code, 404)
        self.assertEqual(len(self.bucket.files), 1)

    def test_delete_removes_private_chunks_and_record(self):
        row = self.upload()
        self.assertEqual(self.client.delete(f'/api/prescription/{row["id"]}').status_code, 200)
        self.assertFalse(self.bucket.files)
        self.assertNotIn(row["id"], self.collection.rows)

    def test_bad_owner_binding_cannot_serve_or_delete_another_original(self):
        row = self.upload()
        file_id = ObjectId(self.collection.rows[row["id"]]["storage_file_id"])
        self.bucket.files[file_id][1]["user_id"] = "another-account"
        self.assertEqual(self.client.get(f'/api/prescription/{row["id"]}/original').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/prescription/{row["id"]}').status_code, 200)
        self.assertIn(file_id, self.bucket.files)

    def test_storage_failure_is_failed_analysis_not_successful_upload(self):
        from app.routers import prescription_router as api
        with patch.object(api, "save_original", new=AsyncMock(side_effect=RuntimeError("Original storage unavailable"))):
            response = self.client.post('/api/prescription/scan', files={"file": ("synthetic.png", image_bytes(), "image/png")})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(next(iter(self.collection.rows.values()))["status"], "failed")


class StorageMigrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.folder = Path(self.temp.name)
        self.bucket = Bucket(); self.patch = patch.object(storage, "bucket", return_value=self.bucket); self.patch.start()
        self.identifier = str(uuid4()); self.path = self.folder / (self.identifier + ".png"); self.path.write_bytes(image_bytes())
        self.row = {"_id": self.identifier, "user_id": "alice", "file_path": str(self.path)}
        self.collection = AsyncMock(); self.collection.update_one.return_value = SimpleNamespace(modified_count=1)
    async def asyncTearDown(self): self.patch.stop(); self.temp.cleanup()
    async def test_migration_verifies_preserves_source_and_is_idempotent(self):
        result = await storage.migrate_original(self.row, self.collection, self.folder)
        self.assertEqual(result, "copied_and_verified")
        self.assertEqual(self.path.read_bytes(), image_bytes())
        stored = self.collection.update_one.call_args.args[1]["$set"]
        self.assertEqual(await storage.migrate_original({**self.row, **stored}, self.collection, self.folder), "already_stored")
        self.assertEqual(len(self.bucket.files), 1)
        self.assertEqual(self.collection.update_one.call_args.args[0]["storage_file_id"], {"$exists": False})
    async def test_changed_record_cleans_up_new_blob(self):
        self.collection.update_one.return_value = SimpleNamespace(modified_count=0)
        self.assertEqual(await storage.migrate_original(self.row, self.collection, self.folder), "record_changed")
        self.assertFalse(self.bucket.files); self.assertTrue(self.path.exists())
    async def test_outside_path_is_never_uploaded(self):
        self.row["file_path"] = str(self.folder.parent / "outside.png")
        self.assertEqual(await storage.migrate_original(self.row, self.collection, self.folder), "missing_local_file")
        self.assertFalse(self.bucket.files); self.collection.update_one.assert_not_awaited()
    async def test_corrupted_copy_is_not_attached(self):
        with patch.object(self.bucket, "open_download_stream", new=AsyncMock(return_value=SimpleNamespace(metadata={"user_id": "alice", "prescription_id": self.identifier, "extension": ".png"}, length=3, read=AsyncMock(return_value=b"bad")))):
            with self.assertRaises(RuntimeError): await storage.migrate_original(self.row, self.collection, self.folder)
        self.assertFalse(self.bucket.files); self.assertTrue(self.path.exists()); self.collection.update_one.assert_not_awaited()
    async def test_missing_and_invalid_gridfs_ids_return_not_found(self):
        for identifier in [str(ObjectId()), "invalid"]:
            with self.assertRaises(HTTPException) as error:
                await storage.original_response({**self.row, "storage_file_id": identifier})
            self.assertEqual(error.exception.status_code, 404)


class StorageCleanupTests(unittest.IsolatedAsyncioTestCase):
    async def test_delete_storage_failure_keeps_report_for_retry(self):
        collection = AsyncMock(); collection.find_one.return_value = {"_id": "report", "user_id": "alice", "status": "completed"}
        with patch.object(service, "prescriptions_collection", collection), patch.object(service, "delete_original", new=AsyncMock(side_effect=RuntimeError("offline"))):
            with self.assertRaises(RuntimeError): await service.delete_prescription("report", "alice")
        collection.find_one_and_delete.assert_not_awaited()
