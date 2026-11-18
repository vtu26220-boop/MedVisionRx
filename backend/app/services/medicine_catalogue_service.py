from datetime import datetime, timezone
from urllib.parse import urlparse
import re

from bson import ObjectId
from fastapi import HTTPException
from pymongo.errors import BulkWriteError

from app.db.mongodb import database
from app.schemas.medicine_catalogue import MedicineCatalogueCreate


collection = database["medicine_catalogue"]

MAX_MEDICINES_PER_REQUEST = 5000


# =========================================================
# IMAGE URL VALIDATION
# =========================================================

def normalize_image_url(
    image_url: str | None,
) -> str | None:
    """
    Clean malformed image URL values and reject invalid URLs.

    This validates the URL structure only.
    It does not verify whether the remote image exists.
    """

    if not image_url or not isinstance(image_url, str):
        return None

    image_url = image_url.strip()

    # Fix values accidentally copied with a JSON field prefix.
    prefix = '"image_url": "'

    if image_url.startswith(prefix):
        image_url = image_url[len(prefix):]

    # Remove accidental wrapping quotation marks.
    image_url = (
        image_url
        .strip()
        .strip('"')
        .strip("'")
    )

    if not image_url:
        return None

    parsed = urlparse(image_url)

    if parsed.scheme not in ("http", "https"):
        return None

    if not parsed.netloc:
        return None

    return image_url


# =========================================================
# SERIALIZATION
# =========================================================

def serialize_medicine(
    medicine: dict | None,
) -> dict:
    """
    Convert a MongoDB medicine document into a JSON-safe
    response dictionary.
    """

    if not medicine:
        return {}

    serialized = dict(medicine)

    object_id = serialized.pop("_id", None)

    if object_id is not None:
        serialized["id"] = str(object_id)

    if "image_url" in serialized:
        serialized["image_url"] = normalize_image_url(
            serialized.get("image_url")
        )

    return serialized


# =========================================================
# CREATE MEDICINE
# =========================================================

async def create_medicine(
    data: MedicineCatalogueCreate,
):
    now = datetime.now(timezone.utc)

    medicine = data.model_dump(mode="json")

    medicine["image_url"] = normalize_image_url(
        medicine.get("image_url")
    )

    medicine["created_at"] = now
    medicine["updated_at"] = now

    result = await collection.insert_one(medicine)

    created = await collection.find_one(
        {"_id": result.inserted_id}
    )

    return serialize_medicine(created)


# =========================================================
# BULK CREATE MEDICINES
# =========================================================

async def create_medicines_bulk(
    medicines: list[MedicineCatalogueCreate],
    batch_size: int = 500,
):
    """
    Insert medicines in batches.

    The endpoint can accept large medicine datasets while
    avoiding one enormous MongoDB insert operation.
    """

    if not medicines:
        raise HTTPException(
            status_code=400,
            detail="Medicine list cannot be empty.",
        )

    if batch_size < 1:
        raise HTTPException(
            status_code=400,
            detail="Batch size must be greater than zero.",
        )

    total_inserted = 0
    failed_records: list[dict] = []

    for start in range(
        0,
        len(medicines),
        batch_size,
    ):
        batch = medicines[
            start:start + batch_size
        ]

        now = datetime.now(timezone.utc)

        documents = []

        for medicine in batch:
            document = medicine.model_dump(
                mode="json"
            )

            document["image_url"] = normalize_image_url(
                document.get("image_url")
            )

            document["created_at"] = now
            document["updated_at"] = now

            documents.append(document)

        try:
            result = await collection.insert_many(
                documents,
                ordered=False,
            )

            total_inserted += len(
                result.inserted_ids
            )

        except BulkWriteError as exc:
            details = exc.details or {}

            inserted_count = details.get(
                "nInserted",
                0,
            )

            total_inserted += inserted_count

            write_errors = details.get(
                "writeErrors",
                [],
            )

            for error in write_errors:
                local_index = error.get(
                    "index",
                    0,
                )

                failed_records.append(
                    {
                        "batch_start_index": start,
                        "record_index": (
                            start + local_index
                        ),
                        "error": error.get(
                            "errmsg",
                            "Insertion failed",
                        ),
                        "code": error.get("code"),
                    }
                )

    return {
        "message": "Bulk medicine upload processed.",
        "total_received": len(medicines),
        "total_inserted": total_inserted,
        "total_failed": len(failed_records),
        "failed_records": failed_records,
    }


# =========================================================
# GET MEDICINES
# SEARCH + CATEGORY + PAGINATION
# =========================================================

async def get_medicines(
    search: str | None = None,
    category: str | None = None,
    page: int = 1,
    limit: int = MAX_MEDICINES_PER_REQUEST,
):
    """
    Retrieve medicines from MongoDB.

    The frontend can request up to 5000 records so the
    dashboard can display them in one continuous scroll.
    """

    if page < 1:
        page = 1

    if limit < 1:
        limit = 1

    if limit > MAX_MEDICINES_PER_REQUEST:
        limit = MAX_MEDICINES_PER_REQUEST

    query: dict = {}

    # -----------------------------------------------------
    # SEARCH
    # -----------------------------------------------------

    if search and search.strip():
        search_pattern = re.escape(
            search.strip()
        )

        query["$or"] = [
            {
                "name": {
                    "$regex": search_pattern,
                    "$options": "i",
                }
            },
            {
                "brand_name": {
                    "$regex": search_pattern,
                    "$options": "i",
                }
            },
            {
                "generic_name": {
                    "$regex": search_pattern,
                    "$options": "i",
                }
            },
            {
                "category": {
                    "$regex": search_pattern,
                    "$options": "i",
                }
            },
            {
                "description": {
                    "$regex": search_pattern,
                    "$options": "i",
                }
            },
            {
                "uses": {
                    "$elemMatch": {
                        "$regex": search_pattern,
                        "$options": "i",
                    }
                }
            },
            {
                "dosage_form": {
                    "$regex": search_pattern,
                    "$options": "i",
                }
            },
            {
                "strength": {
                    "$regex": search_pattern,
                    "$options": "i",
                }
            },
        ]

    # -----------------------------------------------------
    # CATEGORY FILTER
    # -----------------------------------------------------

    if category and category.strip():
        category_pattern = re.escape(
            category.strip()
        )

        query["category"] = {
            "$regex": (
                f"^{category_pattern}$"
            ),
            "$options": "i",
        }

    # -----------------------------------------------------
    # PAGINATION
    # -----------------------------------------------------

    skip = (page - 1) * limit

    cursor = (
        collection.find(query)
        .sort("name", 1)
        .skip(skip)
        .limit(limit)
    )

    medicines = await cursor.to_list(
        length=limit
    )

    total = await collection.count_documents(
        query
    )

    total_pages = (
        (total + limit - 1) // limit
        if total > 0
        else 0
    )

    return {
        "items": [
            serialize_medicine(item)
            for item in medicines
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


# =========================================================
# GET MEDICINE BY ID
# =========================================================

async def get_medicine_by_id(
    medicine_id: str,
):
    if not ObjectId.is_valid(medicine_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid medicine ID",
        )

    medicine = await collection.find_one(
        {
            "_id": ObjectId(medicine_id)
        }
    )

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found",
        )

    return serialize_medicine(medicine)


# =========================================================
# UPDATE MEDICINE
# =========================================================

async def update_medicine(
    medicine_id: str,
    data: MedicineCatalogueCreate,
):
    if not ObjectId.is_valid(medicine_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid medicine ID",
        )

    medicine = data.model_dump(
        mode="json"
    )

    medicine["image_url"] = normalize_image_url(
        medicine.get("image_url")
    )

    medicine["updated_at"] = (
        datetime.now(timezone.utc)
    )

    result = await collection.update_one(
        {
            "_id": ObjectId(medicine_id)
        },
        {
            "$set": medicine
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found",
        )

    return await get_medicine_by_id(
        medicine_id
    )


# =========================================================
# DELETE MEDICINE
# =========================================================

async def delete_medicine(
    medicine_id: str,
):
    if not ObjectId.is_valid(medicine_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid medicine ID",
        )

    result = await collection.delete_one(
        {
            "_id": ObjectId(medicine_id)
        }
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found",
        )

    return {
        "message": "Medicine deleted successfully"
    }