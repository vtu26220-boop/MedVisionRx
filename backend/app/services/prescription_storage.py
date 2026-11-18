"""Private originals in Atlas GridFS, with safe access to older local files."""
import os
from pathlib import Path

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from fastapi.responses import FileResponse, Response
from gridfs.errors import NoFile
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from app.db.mongodb import database

STORAGE = Path(__file__).resolve().parents[1] / "uploads" / "prescription-private"
MAX_BYTES = 10 * 1024 * 1024
BUCKET_NAME = "prescription_originals"


def storage_mode():
    mode = os.getenv("PRESCRIPTION_STORAGE", "gridfs").strip().lower()
    if mode not in {"gridfs", "local"}:
        raise RuntimeError("PRESCRIPTION_STORAGE must be gridfs or local.")
    return mode


def bucket():
    return AsyncIOMotorGridFSBucket(database, bucket_name=BUCKET_NAME)


def local_path(row, storage=STORAGE):
    if not row.get("file_path"):
        return None
    path = Path(row["file_path"]).resolve()
    return path if path.parent == storage.resolve() and path.is_file() else None


async def save_original(identifier, user_id, extension, content, storage=STORAGE):
    if not content or len(content) > MAX_BYTES:
        raise ValueError("Original must be non-empty and no larger than 10 MB.")
    if extension not in {".jpg", ".jpeg", ".png", ".pdf"}:
        raise ValueError("Unsupported original format.")
    # Only server-issued UUID identifiers are allowed as filenames.
    from uuid import UUID
    identifier = str(UUID(identifier))
    if storage_mode() == "local":
        storage.mkdir(parents=True, exist_ok=True)
        path = storage / f"{identifier}{extension}"
        path.write_bytes(content)
        return {"file_path": str(path), "storage_provider": "local"}
    return await upload_to_gridfs(identifier, user_id, extension, content)


async def upload_to_gridfs(identifier, user_id, extension, content):
    file_id = await bucket().upload_from_stream(
        f"{identifier}{extension}", content,
        metadata={"user_id": user_id, "prescription_id": identifier, "extension": extension},
    )
    return {"storage_file_id": str(file_id), "storage_provider": "gridfs"}


async def stored_original(row):
    try:
        file_id = ObjectId(row["storage_file_id"])
        stream = await bucket().open_download_stream(file_id)
    except (NoFile, InvalidId, ValueError, TypeError):
        raise HTTPException(404, "Original file not found.") from None
    metadata = stream.metadata or {}
    if metadata.get("user_id") != row.get("user_id") or metadata.get("prescription_id") != str(row["_id"]):
        raise HTTPException(404, "Original file not found.")
    if not 0 < stream.length <= MAX_BYTES:
        raise HTTPException(404, "Original file not found.")
    return stream, metadata.get("extension", "")


async def original_response(row, storage=STORAGE):
    if row.get("storage_file_id"):
        stream, extension = await stored_original(row)
        data = await stream.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(404, "Original file not found.")
        response = Response
    else:
        data = local_path(row, storage)
        if data is None:
            raise HTTPException(404, "Original file not found.")
        extension = data.suffix.lower()
        response = FileResponse
    media = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}.get(extension)
    if media is None:
        raise HTTPException(404, "Original file not found.")
    return response(data, media_type=media, headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


async def delete_original(row, storage=STORAGE):
    if row.get("storage_file_id"):
        try:
            await stored_original(row)  # Check the owner binding before deletion.
        except HTTPException:
            # A dangling reference must never delete another account's file.
            return
        await bucket().delete(ObjectId(row["storage_file_id"]))
    path = local_path(row, storage)
    if path is not None:
        path.unlink(missing_ok=True)


async def migrate_original(row, collection, storage=STORAGE):
    """Copy an existing private file; attach only after a verified round trip.

    Source files are kept. CAS and cleanup make reruns safe if another migration
    or a deletion wins the race. This helper never reruns OCR or changes reports.
    """
    if row.get("storage_file_id"):
        return "already_stored"
    path = local_path(row, storage)
    if path is None:
        return "missing_local_file"
    from uuid import UUID
    identifier = str(UUID(str(row["_id"])))
    content = path.read_bytes()
    if not content or len(content) > MAX_BYTES:
        return "invalid_size"
    stored = await upload_to_gridfs(identifier, row["user_id"], path.suffix.lower(), content)
    try:
        candidate = {**row, **stored}
        stream, _ = await stored_original(candidate)
        if await stream.read() != content:
            raise RuntimeError("Original verification failed; source was preserved.")
        result = await collection.update_one(
            {"_id": row["_id"], "user_id": row["user_id"], "storage_file_id": {"$exists": False}},
            {"$set": stored},
        )
        if not result.modified_count:
            await bucket().delete(ObjectId(stored["storage_file_id"]))
            return "record_changed"
    except Exception:
        await bucket().delete(ObjectId(stored["storage_file_id"]))
        raise
    return "copied_and_verified"
