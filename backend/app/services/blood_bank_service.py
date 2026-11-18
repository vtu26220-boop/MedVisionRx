from datetime import datetime, timezone
from typing import Optional, Any

from bson import ObjectId

from app.db.mongodb import database
from app.schemas.blood_bank import BloodBankCreate


blood_banks_collection = database["blood_banks"]


# ============================================================
# HELPER: CONVERT MONGODB OBJECTIDS TO STRINGS
# ============================================================

def serialize_blood_bank(data: Any):
    """
    Recursively convert MongoDB ObjectId values into strings.

    This prevents FastAPI JSON serialization errors.
    """

    if isinstance(data, ObjectId):
        return str(data)

    if isinstance(data, dict):
        return {
            key: serialize_blood_bank(value)
            for key, value in data.items()
        }

    if isinstance(data, list):
        return [
            serialize_blood_bank(item)
            for item in data
        ]

    return data


# ============================================================
# CREATE ONE BLOOD BANK
# ============================================================

async def create_blood_bank(
    blood_bank: BloodBankCreate,
):
    """
    Create a new blood bank record.
    """

    now = datetime.now(timezone.utc).isoformat()

    blood_bank_data = blood_bank.model_dump(
        mode="json"
    )

    blood_bank_data["created_at"] = now
    blood_bank_data["updated_at"] = now

    result = await blood_banks_collection.insert_one(
        blood_bank_data
    )

    created_bank = {
        "id": str(result.inserted_id),
        **blood_bank_data,
    }

    return serialize_blood_bank(
        created_bank
    )


# ============================================================
# GET ONE BLOOD BANK
# ============================================================

async def get_blood_bank_by_id(
    blood_bank_id: str,
):
    """
    Get one blood bank by MongoDB ID.
    """

    if not ObjectId.is_valid(
        blood_bank_id
    ):
        return None

    blood_bank = await blood_banks_collection.find_one(
        {
            "_id": ObjectId(
                blood_bank_id
            )
        }
    )

    if blood_bank is None:
        return None

    blood_bank["id"] = str(
        blood_bank.pop("_id")
    )

    return serialize_blood_bank(
        blood_bank
    )


# ============================================================
# GET ACTIVE BLOOD BANKS
# ============================================================

async def get_active_blood_banks(
    city: Optional[str] = None,
    state: Optional[str] = None,
):
    """
    Get active blood banks for the public
    Blood Banks page.

    Optional filters:
    - city
    - state
    """

    query = {
        "is_active": True,
    }

    if city:
        query["city"] = {
            "$regex": city.strip(),
            "$options": "i",
        }

    if state:
        query["state"] = {
            "$regex": state.strip(),
            "$options": "i",
        }

    blood_banks = []

    cursor = blood_banks_collection.find(
        query
    ).sort(
        "name",
        1,
    )

    async for blood_bank in cursor:

        blood_bank["id"] = str(
            blood_bank.pop("_id")
        )

        blood_banks.append(
            serialize_blood_bank(
                blood_bank
            )
        )

    return blood_banks


# ============================================================
# GET ALL BLOOD BANKS
# ============================================================

async def get_all_blood_banks():
    """
    Get all blood banks.

    Intended for admin use.
    Includes active and inactive records.
    """

    blood_banks = []

    cursor = blood_banks_collection.find().sort(
        "created_at",
        -1,
    )

    async for blood_bank in cursor:

        blood_bank["id"] = str(
            blood_bank.pop("_id")
        )

        blood_banks.append(
            serialize_blood_bank(
                blood_bank
            )
        )

    return blood_banks


# ============================================================
# UPDATE BLOOD BANK
# ============================================================

async def update_blood_bank(
    blood_bank_id: str,
    blood_bank: BloodBankCreate,
):
    """
    Update an existing blood bank.
    """

    if not ObjectId.is_valid(
        blood_bank_id
    ):
        return None

    blood_bank_data = blood_bank.model_dump(
        mode="json"
    )

    blood_bank_data["updated_at"] = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )

    result = await blood_banks_collection.update_one(
        {
            "_id": ObjectId(
                blood_bank_id
            )
        },
        {
            "$set": blood_bank_data
        },
    )

    if result.matched_count == 0:
        return None

    return await get_blood_bank_by_id(
        blood_bank_id
    )


# ============================================================
# DELETE BLOOD BANK
# ============================================================

async def delete_blood_bank(
    blood_bank_id: str,
):
    """
    Permanently delete a blood bank.

    Intended for authorized admin use.
    """

    if not ObjectId.is_valid(
        blood_bank_id
    ):
        return False

    result = await blood_banks_collection.delete_one(
        {
            "_id": ObjectId(
                blood_bank_id
            )
        }
    )

    return result.deleted_count > 0


# ============================================================
# ENABLE / DISABLE BLOOD BANK
# ============================================================

async def set_blood_bank_status(
    blood_bank_id: str,
    is_active: bool,
):
    """
    Enable or disable a blood bank.

    Disabled blood banks remain in MongoDB
    but are hidden from the public Blood Banks page.
    """

    if not ObjectId.is_valid(
        blood_bank_id
    ):
        return None

    result = await blood_banks_collection.update_one(
        {
            "_id": ObjectId(
                blood_bank_id
            )
        },
        {
            "$set": {
                "is_active": is_active,
                "updated_at": datetime.now(
                    timezone.utc
                ).isoformat(),
            }
        },
    )

    if result.matched_count == 0:
        return None

    return await get_blood_bank_by_id(
        blood_bank_id
    )