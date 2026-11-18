from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

from app.core.firebase_admin import verify_firebase_token
from pymongo.errors import DuplicateKeyError
from app.services.prescription_storage import save_original, original_response
from app.services.prescription_ocr import capabilities, image_pages
from app.services.prescription_service import (
    STORAGE, analyze_prescription, confirm_prescription, delete_prescription,
    get_prescription_by_id, get_prescription_history, prescriptions_collection,
)

router = APIRouter(prefix="/api/prescription", tags=["Prescription Analyzer"])
security = HTTPBearer(auto_error=False)
MAX_FILE_SIZE = 10 * 1024 * 1024


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    if not credentials:
        raise HTTPException(401, "Sign in to access your prescriptions.")
    try:
        decoded = verify_firebase_token(credentials.credentials)
        if not decoded.get("uid"):
            raise ValueError("Missing UID")
        return decoded["uid"]
    except Exception as exc:
        raise HTTPException(401, "Your session expired. Sign in again.") from exc


class PrescribedInstructions(BaseModel):
    dose: str = Field(default="", max_length=250)
    frequency: str = Field(default="", max_length=250)
    duration: str = Field(default="", max_length=250)
    morning: str = Field(default="", max_length=250)
    afternoon: str = Field(default="", max_length=250)
    evening: str = Field(default="", max_length=250)
    night: str = Field(default="", max_length=250)
    meal_instructions: str = Field(default="", max_length=500)
    schedule_code: str = Field(default="", max_length=100)


class DocumentField(BaseModel):
    key: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=150)
    value: str = Field(default="", max_length=1500)
    source_text: str = Field(default="", max_length=2000)


class ReviewedMedicine(BaseModel):
    medicine_name: str = Field(min_length=1, max_length=140)
    strength: str = Field(default="", max_length=100)
    dosage_form: str = Field(default="", max_length=100)
    instructions: str = Field(default="", max_length=1000)
    source_text: str = Field(default="", max_length=2000)
    prescribed: PrescribedInstructions | None = None

    @field_validator("medicine_name")
    @classmethod
    def name_required(cls, value):
        if not value.strip():
            raise ValueError("A medicine name is required.")
        return value.strip()


class Review(BaseModel):
    medicines: list[ReviewedMedicine] = Field(default_factory=list, max_length=30)
    confirmed: bool
    version: int = Field(ge=1)
    document_fields: list[DocumentField] | None = Field(default=None, max_length=80)


@router.get("/health")
async def health(user_id: str = Depends(current_user)):
    return capabilities()


@router.get("/history/all")
async def history(user_id: str = Depends(current_user)):
    records = await get_prescription_history(user_id)
    return {"success": True, "count": len(records), "data": records}


@router.post("/scan")
async def scan(file: UploadFile = File(...), user_id: str = Depends(current_user), idempotency_key: str | None = Header(default=None)):
    if not capabilities()["available"]:
        raise HTTPException(503, "Local Prescription OCR is not installed in this backend environment. Install requirements-prescription.txt and restart the server. See the Prescription setup guide.")
    extension = Path(file.filename or "").suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".pdf"}:
        raise HTTPException(400, "Upload a JPG, PNG or PDF prescription.")
    content = await file.read(MAX_FILE_SIZE + 1)
    if not content or len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "Upload a non-empty file no larger than 10 MB.")
    try:
        await run_in_threadpool(image_pages, content, extension)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    try:
        identifier = str(UUID(idempotency_key)) if idempotency_key else str(uuid4())
    except ValueError as exc:
        raise HTTPException(400, "Invalid upload request identifier.") from exc
    existing = await get_prescription_by_id(identifier, user_id)
    if existing:
        if existing["status"] == "processing":
            raise HTTPException(409, "This upload is still processing. Open History in a moment.")
        return {"success": True, "data": existing}
    # Never trust a client-supplied owner ID or filename as a storage path.
    if await prescriptions_collection.find_one({"_id": identifier}):
        raise HTTPException(409, "Upload identifier already exists. Start a new upload.")
    now = datetime.now(timezone.utc)
    document = {"_id": identifier, "user_id": user_id, "filename": Path(file.filename or "prescription").name,
                "status": "processing", "medicines": [], "created_at": now, "updated_at": now, "version": 1}
    try:
        await prescriptions_collection.insert_one(document)
    except DuplicateKeyError:
        raise HTTPException(409, "Upload identifier already exists. Open History or start a new upload.") from None
    try:
        stored = await save_original(identifier, user_id, extension, content, STORAGE)
        await prescriptions_collection.update_one({"_id": identifier, "user_id": user_id}, {"$set": stored})
        result = await analyze_prescription(file_content=content, filename=document["filename"], user_id=user_id, prescription_id=identifier)
        return {"success": True, "data": result}
    except Exception as exc:
        message = str(exc) if isinstance(exc, (ValueError, RuntimeError)) else "Analysis failed. Try a clearer image or check OCR configuration."
        await prescriptions_collection.update_one({"_id": identifier, "user_id": user_id}, {"$set": {"status": "failed", "error": message, "updated_at": datetime.now(timezone.utc)}})
        raise HTTPException(422 if isinstance(exc, ValueError) else 503, message) from exc


@router.get("/{prescription_id}")
async def detail(prescription_id: str, user_id: str = Depends(current_user)):
    result = await get_prescription_by_id(prescription_id, user_id)
    if not result:
        raise HTTPException(404, "Prescription not found.")
    return {"success": True, "data": result}


@router.patch("/{prescription_id}/review")
async def review(prescription_id: str, body: Review, user_id: str = Depends(current_user)):
    if not body.confirmed:
        raise HTTPException(400, "Confirm that you checked the medicine details against the prescription.")
    try:
        result = await confirm_prescription(prescription_id, user_id, body.medicines, body.version, body.document_fields)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    if not result:
        raise HTTPException(404, "Prescription not found.")
    return {"success": True, "data": result}


@router.get("/{prescription_id}/original")
async def original(prescription_id: str, user_id: str = Depends(current_user)):
    row = await prescriptions_collection.find_one({"_id": prescription_id, "user_id": user_id})
    if not row:
        raise HTTPException(404, "Original file not found.")
    return await original_response(row, STORAGE)


@router.get("/{prescription_id}/report")
async def report(prescription_id: str, user_id: str = Depends(current_user)):
    # A saved structured report; frontend also supports Print / Save as PDF.
    return await detail(prescription_id, user_id)


@router.delete("/{prescription_id}")
async def remove(prescription_id: str, user_id: str = Depends(current_user)):
    try:
        deleted = await delete_prescription(prescription_id, user_id)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    if not deleted:
        raise HTTPException(404, "Prescription not found.")
    return {"success": True}
