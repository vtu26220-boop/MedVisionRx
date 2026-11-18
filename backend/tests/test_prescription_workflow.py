import copy
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from app.routers import prescription_router as api
from app.services import prescription_service as service
from app.services.prescription_ocr import image_pages, capabilities, extract_document
from app.services.prescription_reference import exact_catalogue_match, pharmacy_links, reference_for
from app.services.prescription_structure import extract_document_details, extract_prescribed_instructions


class Cursor:
    def __init__(self, rows): self.rows = rows
    def sort(self, key, direction):
        self.rows.sort(key=lambda row: row.get(key, ""), reverse=direction < 0)
        return self
    async def to_list(self, length=None): return copy.deepcopy(self.rows)


class Collection:
    def __init__(self): self.rows = {}
    def match(self, row, query): return all(row.get(key) == value for key, value in query.items())
    async def find_one(self, query):
        return next((copy.deepcopy(row) for row in self.rows.values() if self.match(row, query)), None)
    def find(self, query): return Cursor([row for row in self.rows.values() if self.match(row, query)])
    async def insert_one(self, row): self.rows[row["_id"]] = copy.deepcopy(row)
    async def update_one(self, query, change):
        for row in self.rows.values():
            if self.match(row, query):
                row.update(change.get("$set", {}))
                for key, value in change.get("$inc", {}).items(): row[key] = row.get(key, 0) + value
                return type("Result", (), {"modified_count": 1})()
        return type("Result", (), {"modified_count": 0})()
    async def find_one_and_delete(self, query):
        for key, row in list(self.rows.items()):
            if self.match(row, query): return self.rows.pop(key)
        return None


def image_bytes():
    image = Image.new("RGB", (200, 100), "white")
    stream = io.BytesIO(); image.save(stream, "PNG")
    return stream.getvalue()


CATALOGUE = [{"name": "ExampleMed", "generic_name": "Example ingredient", "brand_names": ["Example brand"], "verified": True,
              "information_source": "https://example.org/reviewed-label", "uses": ["Sourced use text"],
              "side_effects": ["Sourced side effect text"], "age_restrictions": {"children": "Refer to exact formulation."}}]


class PrescriptionWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.storage = Path(self.temp.name)
        self.collection = Collection()
        self.patches = [
            patch.object(api, "STORAGE", self.storage), patch.object(service, "STORAGE", self.storage),
            patch.object(api, "prescriptions_collection", self.collection), patch.object(service, "prescriptions_collection", self.collection),
            patch.object(api, "capabilities", return_value={"available": True, "provider": "Test OCR", "pdf": True}),
            patch.object(service, "catalogue", new=AsyncMock(return_value=CATALOGUE)),
            patch("app.services.prescription_reference.public_label", return_value=None),
            patch.object(service, "extract_document", return_value={"text": "Dr Example\nTab ExampleMed 10 mg BD\nTab UnreadableDrug 5 mg", "provider": "Test OCR", "confidence": .91}),
        ]
        for item in self.patches: item.start()
        self.app = FastAPI(); self.app.include_router(api.router)
        self.app.dependency_overrides[api.current_user] = lambda: "alice"
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        for item in reversed(self.patches): item.stop()
        self.temp.cleanup()

    def upload(self):
        response = self.client.post("/api/prescription/scan", files={"file": ("synthetic.png", image_bytes(), "image/png")})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["data"]

    def test_word_retry_adds_medicine_without_attaching_strength_to_previous_drug(self):
        with patch.object(service, "extract_document", return_value={"text": "ORS", "provider": "Test OCR", "confidence": .8, "medicine_readings": [{"text": "Dextrose 5%", "method": "local_word_consensus"}]}):
            row = self.upload()
        self.assertEqual([m["medicine_name"] for m in row["medicines"]], ["ORS", "Dextrose"])
        self.assertEqual(row["medicines"][0]["strength"], "")
        self.assertEqual(row["medicines"][1]["strength"], "5%")
        self.assertTrue(all(len(m["pharmacy_options"]) == 4 for m in row["medicines"]))
        self.assertTrue(all(not m["user_confirmed"] for m in row["medicines"]))

    def test_scan_requires_review_and_saves_original(self):
        row = self.upload()
        self.assertEqual(row["status"], "needs_review")
        self.assertEqual(len(row["medicines"]), 2)
        self.assertTrue(all(m["needs_verification"] for m in row["medicines"]))
        self.assertEqual(len(row["medicines"][0]["pharmacy_options"]), 4)
        self.assertEqual(row["medicines"][0]["generic_name"], "Example ingredient")
        self.assertEqual(row["medicines"][1]["pharmacy_options"], [])
        self.assertTrue(all(not m["user_confirmed"] for m in row["medicines"]))
        self.assertNotIn("file_path", row)
        self.assertNotIn("user_id", row)
        original = self.client.get(f'/api/prescription/{row["id"]}/original')
        self.assertEqual(original.status_code, 200)
        self.assertEqual(original.content, image_bytes())

    def test_history_and_every_record_endpoint_enforce_owner(self):
        row = self.upload()
        self.app.dependency_overrides[api.current_user] = lambda: "bob"
        self.assertEqual(self.client.get("/api/prescription/history/all?user_id=alice").json()["data"], [])
        for suffix in ["", "/original", "/report"]:
            self.assertEqual(self.client.get(f'/api/prescription/{row["id"]}{suffix}?user_id=alice').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/prescription/{row["id"]}').status_code, 404)
        review = {"medicines": [{"medicine_name": "ExampleMed"}], "version": 1, "confirmed": True}
        self.assertEqual(self.client.patch(f'/api/prescription/{row["id"]}/review', json=review).status_code, 404)

    def test_unauthenticated_access_is_rejected(self):
        self.app.dependency_overrides.clear()
        for route in ["/health", "/history/all", "/unknown", "/unknown/original", "/unknown/report"]:
            self.assertEqual(self.client.get("/api/prescription" + route).status_code, 401)
        self.assertEqual(self.client.post("/api/prescription/scan", files={"file": ("a.png", image_bytes())}).status_code, 401)

    def test_review_persists_sourced_report_without_reanalysis(self):
        row = self.upload()
        body = {"version": row["version"], "confirmed": True, "medicines": [{"medicine_name": "ExampleMed", "strength": "10 mg", "dosage_form": "tablet", "instructions": "As written"}]}
        response = self.client.patch(f'/api/prescription/{row["id"]}/review', json=body)
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()["data"]
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["version"], 2)
        self.assertEqual(result["medicines"][0]["generic_name"], "Example ingredient")
        self.assertIn("10+mg", result["medicines"][0]["pharmacy_options"][0]["url"])
        with patch.object(service, "extract_document", side_effect=AssertionError("OCR must not rerun")):
            saved = self.client.get(f'/api/prescription/{row["id"]}').json()["data"]
            self.assertEqual(saved, result)
            self.assertEqual(self.client.get("/api/prescription/history/all").json()["data"][0], result)

    def test_document_fields_timing_and_four_pharmacies_are_saved_privately(self):
        text = "Demo Hospital\nDr Example\nPatient: Demo Person  Age: 25\nDate: 17/11/2026\nTab ExampleMed 10 mg take 1 tablet twice daily for 5 days morning: 1 night: 1 after dinner\nUnclassified note stays visible"
        with patch.object(service, "extract_document", return_value={"text": text, "provider": "Test OCR", "confidence": .9}):
            row = self.upload()
        fields = {field["key"]: field["value"] for field in row["document_details"]["fields"]}
        self.assertEqual(fields["hospital_name"], "Demo Hospital")
        self.assertEqual(fields["patient_name"], "Demo Person")
        self.assertEqual(fields["patient_age"], "25")
        self.assertIn("Unclassified note", row["document_details"]["remaining_text"])
        medicine = row["medicines"][0]
        self.assertEqual(medicine["prescribed"]["dose"], "1 tablet")
        self.assertEqual(medicine["prescribed"]["night"], "1")
        self.assertEqual(medicine["prescribed"]["meal_instructions"], "after dinner")
        reviewed_fields = [{k: field[k] for k in ["key", "label", "value", "source_text"]} for field in row["document_details"]["fields"]]
        reviewed_fields[0]["value"] = "Corrected Demo Hospital"
        reviewed_medicine = {k: medicine[k] for k in ["medicine_name", "strength", "dosage_form", "instructions", "source_text", "prescribed"]}
        response = self.client.patch(f'/api/prescription/{row["id"]}/review', json={"confirmed": True, "version": 1, "document_fields": reviewed_fields, "medicines": [reviewed_medicine]})
        self.assertEqual(response.status_code, 200, response.text)
        saved = response.json()["data"]
        self.assertEqual(saved["document_details"]["fields"][0]["value"], "Corrected Demo Hospital")
        self.assertEqual(saved["medicines"][0]["prescribed"], medicine["prescribed"])
        self.assertEqual(len(saved["medicines"][0]["pharmacy_options"]), 4)
        with patch.object(service, "extract_document", side_effect=AssertionError("History must not rerun OCR")):
            self.assertEqual(self.client.get("/api/prescription/history/all").json()["data"][0], saved)
        self.app.dependency_overrides[api.current_user] = lambda: "bob"
        self.assertEqual(self.client.get(f'/api/prescription/{row["id"]}').status_code, 404)
        self.assertEqual(self.client.get("/api/prescription/history/all").json()["data"], [])

    def test_text_only_analysis_is_saved_and_corrections_need_no_invented_medicine(self):
        text = "Demo Hospital\nName..\nSynthetic Student\nOriginal handwritten note not recognized as a medicine"
        with patch.object(service, "extract_document", return_value={"text": text, "provider": "Test OCR", "confidence": .5}):
            row = self.upload()
        self.assertEqual(row["medicines"], [])
        self.assertEqual(self.client.get("/api/prescription/history/all").json()["count"], 1)
        self.assertEqual(row["raw_text"], text)
        fields = [{key: field[key] for key in ["key", "label", "value", "source_text"]} for field in row["document_details"]["fields"]]
        result = self.client.patch(f'/api/prescription/{row["id"]}/review', json={"version": 1, "confirmed": True, "medicines": [], "document_fields": fields})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()["data"]["medicines"], [])
        self.assertEqual(result.json()["data"]["raw_text"], text)

    def test_reference_outage_does_not_hide_or_lose_ocr_results(self):
        with patch.object(service, "reference_for", side_effect=RuntimeError("Synthetic outage")):
            row = self.upload()
        self.assertEqual(row["status"], "needs_review")
        self.assertTrue(row["raw_text"])
        self.assertEqual(row["medicines"][0]["reference_status"], "unavailable")
        self.assertEqual(row["medicines"][0]["pharmacy_options"], [])

    def test_review_rejects_overlong_prescribed_instruction(self):
        row = self.upload()
        result = self.client.patch(f'/api/prescription/{row["id"]}/review', json={"confirmed": True, "version": 1, "medicines": [{"medicine_name": "ExampleMed", "prescribed": {"morning": "x" * 251}}]})
        self.assertEqual(result.status_code, 422)

    def test_review_rejects_unconfirmed_blank_and_stale_submissions(self):
        row = self.upload()
        url = f'/api/prescription/{row["id"]}/review'
        body = {"confirmed": False, "version": 1, "medicines": [{"medicine_name": "ExampleMed"}]}
        self.assertEqual(self.client.patch(url, json=body).status_code, 400)
        body["confirmed"] = True; body["medicines"][0]["medicine_name"] = "  "
        self.assertEqual(self.client.patch(url, json=body).status_code, 422)
        body["medicines"][0]["medicine_name"] = "ExampleMed"
        self.assertEqual(self.client.patch(url, json=body).status_code, 200)
        self.assertEqual(self.client.patch(url, json=body).status_code, 409)

    def test_unknown_medicine_never_gets_invented_details_or_buying_links(self):
        row = self.upload()
        with patch("app.services.prescription_reference.public_label", side_effect=LookupError("unavailable")):
            result = self.client.patch(f'/api/prescription/{row["id"]}/review', json={"confirmed": True, "version": 1, "medicines": [{"medicine_name": "UnreadableDrug"}]}).json()["data"]
        medicine = result["medicines"][0]
        self.assertEqual(medicine["reference_status"], "unavailable")
        self.assertIsNone(medicine["generic_name"])
        self.assertEqual(medicine["pharmacy_options"], [])
        self.assertEqual(medicine["uses"], [])

    def test_idempotency_prevents_duplicate_history(self):
        key = "5d26c7e1-6f6a-4edf-bc75-afbf9bd58840"
        for _ in range(2):
            response = self.client.post("/api/prescription/scan", headers={"Idempotency-Key": key}, files={"file": ("same.png", image_bytes())})
            self.assertEqual(response.status_code, 200)
        self.assertEqual(len(self.client.get("/api/prescription/history/all").json()["data"]), 1)

    def test_corrupt_and_oversize_uploads_rejected(self):
        for name, content in [("fake.png", b"not an image"), ("bad.exe", b"anything"), ("empty.png", b""), ("large.png", b"x" * (10 * 1024 * 1024 + 1))]:
            result = self.client.post("/api/prescription/scan", files={"file": (name, content)})
            self.assertEqual(result.status_code, 400, result.text)
        self.assertEqual(len(self.collection.rows), 0)

    def test_ocr_failure_saved_as_failed_not_success(self):
        with patch.object(service, "extract_document", side_effect=ValueError("No readable text")):
            result = self.client.post("/api/prescription/scan", files={"file": ("a.png", image_bytes())})
        self.assertEqual(result.status_code, 422)
        history = self.client.get("/api/prescription/history/all").json()["data"]
        self.assertEqual(history[0]["status"], "failed")

    def test_missing_ocr_is_explicit_and_creates_no_fake_record(self):
        with patch.object(api, "capabilities", return_value={"available": False}):
            result = self.client.post("/api/prescription/scan", files={"file": ("a.png", image_bytes())})
        self.assertEqual(result.status_code, 503)
        self.assertEqual(len(self.collection.rows), 0)

    def test_delete_removes_original_and_history(self):
        row = self.upload()
        self.assertEqual(self.client.delete(f'/api/prescription/{row["id"]}').status_code, 200)
        self.assertEqual(list(self.storage.iterdir()), [])
        self.assertEqual(self.client.get("/api/prescription/history/all").json()["count"], 0)


class PrescriptionMatchingTests(unittest.TestCase):
    def test_local_mode_ignores_existing_google_key(self):
        output = type("Output", (), {"txts": ("Tab ExampleMed 10 mg",), "scores": (.95,)})()
        with patch.dict(os.environ, {"PRESCRIPTION_OCR_PROVIDER": "local", "PRESCRIPTION_GOOGLE_VISION_API_KEY": "synthetic-test-key"}), \
             patch("app.services.prescription_ocr.get_local_engine", return_value=lambda image, **kwargs: output), \
             patch("app.services.prescription_ocr.urlopen", side_effect=AssertionError("Cloud OCR must not be contacted")):
            info = capabilities()
            self.assertEqual(info["provider"], "Local RapidOCR (free)")
            self.assertFalse(info["multilingual"])
            result = extract_document([image_bytes()], Path("unused"))
        self.assertEqual(result["text"], "Tab ExampleMed 10 mg")
        self.assertEqual(result["confidence"], .95)

    def test_empty_local_result_is_not_a_fake_medicine(self):
        output = type("Output", (), {"txts": None, "scores": None})()
        with patch.dict(os.environ, {"PRESCRIPTION_OCR_PROVIDER": "local"}), \
             patch("app.services.prescription_ocr.get_local_engine", return_value=lambda image, **kwargs: output):
            result = extract_document([image_bytes()], Path("unused"))
        self.assertEqual(result["text"], "")
        self.assertIsNone(result["confidence"])

    def test_no_fuzzy_name_confirmation(self):
        self.assertIsNone(exact_catalogue_match("ExampleMcd", CATALOGUE))
        self.assertIsNotNone(exact_catalogue_match("examplemed", CATALOGUE))

    def test_conflicting_ingredient_names_are_ambiguous(self):
        rows = CATALOGUE + [{**CATALOGUE[0], "generic_name": "Different ingredient"}]
        self.assertIsNone(exact_catalogue_match("ExampleMed", rows))

    def test_catalogue_formulation_must_be_disambiguated(self):
        rows = [{**CATALOGUE[0], "strength": "10 mg", "dosage_form": "tablet"},
                {**CATALOGUE[0], "strength": "20 mg", "dosage_form": "tablet"}]
        self.assertIsNone(exact_catalogue_match("ExampleMed", rows))
        self.assertEqual(exact_catalogue_match("ExampleMed", rows, "20 mg", "tablet")["strength"], "20 mg")

    def test_missing_ingredients_are_not_a_confirmed_catalogue_match(self):
        self.assertIsNone(exact_catalogue_match("ExampleMed", [{"name": "ExampleMed"}]))

    def test_header_not_medicine_and_strength_not_invented(self):
        rows = service.parse_candidates("Doctor Example\nPatient Name\nTab ExampleMed BD\nTab Mystery 4 mg", CATALOGUE)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["strength"], "")
        self.assertTrue(rows[0]["needs_verification"])
        self.assertIsNone(rows[1]["generic_name"])

    def test_unsourced_catalogue_clinical_text_not_published(self):
        with patch("app.services.prescription_reference.public_label", return_value=None):
            info = reference_for("ExampleMed", "", "", [{**CATALOGUE[0], "verified": False}])
        self.assertEqual(info["reference_status"], "unavailable")
        self.assertEqual(info["uses"], [])

    def test_pharmacy_query_contains_strength_and_form(self):
        links = pharmacy_links("Example + Med", "10 mg", "tablet")
        self.assertIn("Example+%2B+Med+10+mg+tablet", links[0]["url"])

    def test_legacy_saved_text_can_be_structured_without_reanalysis_or_mutation(self):
        original = {"_id": "legacy", "status": "completed", "raw_text": "Demo Hospital\nPatient: Demo Person", "medicines": [{"medicine_name": "ExampleMed", "source_text": "Tab ExampleMed 10 mg 1-0-1"}]}
        before = copy.deepcopy(original)
        with patch.object(service, "extract_document", side_effect=AssertionError("Do not rerun OCR")), patch.object(service, "reference_for", side_effect=AssertionError("Do not refresh references")):
            result = service.serialize(original)
        self.assertEqual(original, before)
        self.assertEqual(result["medicines"][0]["prescribed"]["schedule_code"], "1-0-1")
        self.assertFalse(result["document_details"]["reviewed"])
        self.assertEqual(result["document_details"]["fields"][0]["value"], "Demo Hospital")

    def test_dotted_header_labels_preserve_the_recognized_name_and_id(self):
        details = extract_document_details("Hospital & Research Centre\nName..\nSynthetic Student\nUHID/IP No.....\n10193", [])
        fields = {field["key"]: field["value"] for field in details["fields"]}
        self.assertEqual(fields["name_as_written"], "Synthetic Student")
        self.assertEqual(fields["prescription_number"], "10193")

    def test_unlabelled_schedule_never_invents_times_or_meals(self):
        result = extract_prescribed_instructions("Tab ExampleMed 10 mg 1-0-1 BD")
        self.assertEqual(result["schedule_code"], "1-0-1")
        for key in ["morning", "afternoon", "evening", "night", "meal_instructions"]:
            self.assertEqual(result[key], "")
        self.assertIn("confirm its meaning", result["frequency"])

    def test_strength_is_not_a_personal_dose(self):
        result = extract_prescribed_instructions("ExampleMed 500 mg")
        self.assertEqual(result["dose"], "")
        self.assertEqual(result["frequency"], "")

    def test_split_instruction_lines_are_attached_to_medicine(self):
        rows = service.parse_candidates("Tab ExampleMed\n10 mg\n1-0-1\nAfter food\n5 days", CATALOGUE)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["strength"], "10 mg")
        self.assertEqual(rows[0]["dosage_form"], "tablet")
        self.assertEqual(rows[0]["prescribed"]["duration"], "5 days")
        self.assertEqual(rows[0]["prescribed"]["meal_instructions"], "After food")
        self.assertEqual(rows[0]["prescribed"]["morning"], "")

    def test_no_document_details_are_invented_when_labels_are_absent(self):
        details = extract_document_details("Unreadable heading\nSome original note", [])
        self.assertTrue(all(not field["value"] for field in details["fields"]))
        self.assertIn("Unreadable heading", details["remaining_text"])

    def test_observation_is_not_a_medicine(self):
        self.assertEqual(service.parse_candidates("Blood sugar: 100 mg\nWeight: 60 kg", CATALOGUE), [])

    def test_four_pharmacy_searches_use_encoded_name_and_strength(self):
        links = pharmacy_links("Example + Med", "10 mg", "tablet")
        self.assertEqual(len(links), 4)
        self.assertEqual(len({link["store"] for link in links}), 4)
        self.assertTrue(all(link["url"].startswith("https://") for link in links))
        self.assertTrue(all("Example+%2B+Med+10+mg+tablet" in link["url"] for link in links))

    def test_pdf_validation_and_page_limit(self):
        try:
            import pypdfium2  # noqa: F401
        except ImportError:
            self.skipTest("PDF runtime not installed")
        image = Image.new("RGB", (100, 100), "white")
        output = io.BytesIO(); image.save(output, "PDF")
        self.assertEqual(len(image_pages(output.getvalue(), ".pdf")), 1)
        output = io.BytesIO(); image.save(output, "PDF", save_all=True, append_images=[image] * 5)
        with self.assertRaises(ValueError): image_pages(output.getvalue(), ".pdf")


if __name__ == "__main__":
    unittest.main()
