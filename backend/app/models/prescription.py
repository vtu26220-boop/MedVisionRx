from datetime import datetime, timezone


def create_prescription_document(
    *,
    user_id=None,
    filename=None,
    original_file=None,
):
    return {
        "user_id": user_id,
        "filename": filename,
        "original_file": original_file,

        "status": "processing",

        "doctor_name": None,
        "patient_name": None,
        "prescription_date": None,

        "raw_text": "",

        "medicines": [],

        "interactions": [],

        "warnings": [],

        "report_url": None,

        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }