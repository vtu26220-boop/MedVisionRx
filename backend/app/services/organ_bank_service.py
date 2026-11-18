from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongodb import database
from app.schemas.organ_bank import (
    OrganBankCreate,
    OrganBankUpdate,
)


# ============================================================
# MONGODB COLLECTION
# ============================================================

organ_banks_collection = database[
    "organ_banks"
]


# ============================================================
# SERIALIZER
# ============================================================

def _serialize_document(
    document: Optional[dict],
) -> Optional[dict]:

    if not document:
        return None

    result = dict(document)

    if "_id" in result:
        result["id"] = str(
            result.pop("_id")
        )

    return result


# ============================================================
# OBJECT ID
# ============================================================

def _get_object_id(
    value: str,
) -> Optional[ObjectId]:

    try:
        return ObjectId(value)

    except (
        InvalidId,
        TypeError,
    ):
        return None


# ============================================================
# CREATE ONE ORGAN BANK
# ============================================================

async def create_organ_bank(
    bank: OrganBankCreate,
) -> dict:

    bank_data = bank.model_dump(
        mode="json"
    )

    now = datetime.now(
        timezone.utc
    )

    bank_data["created_at"] = now
    bank_data["updated_at"] = now

    # --------------------------------------------------------
    # DUPLICATE CHECK
    # --------------------------------------------------------

    existing = await (
        organ_banks_collection.find_one(
            {
                "name": bank_data["name"],
                "city": bank_data["city"],
                "state": bank_data["state"],
            }
        )
    )

    if existing:

        return {
            "already_exists": True,
            "message": (
                "This Organ Bank already exists."
            ),
            **_serialize_document(
                existing
            ),
        }

    # --------------------------------------------------------
    # INSERT
    # --------------------------------------------------------

    result = await (
        organ_banks_collection.insert_one(
            bank_data
        )
    )

    created = await (
        organ_banks_collection.find_one(
            {
                "_id": result.inserted_id
            }
        )
    )

    if not created:
        raise RuntimeError(
            "Organ Bank was inserted but could not be retrieved."
        )

    return {
        "already_exists": False,
        "message": (
            "Organ Bank created successfully."
        ),
        **_serialize_document(
            created
        ),
    }


# ============================================================
# BULK CREATE
# ============================================================

async def create_organ_banks_bulk(
    banks: list[OrganBankCreate],
) -> dict:

    if not banks:

        return {
            "inserted_count": 0,
            "message": (
                "No Organ Bank records were provided."
            ),
            "records": [],
        }

    now = datetime.now(
        timezone.utc
    )

    documents = []

    duplicate_count = 0

    # --------------------------------------------------------
    # PREPARE RECORDS
    # --------------------------------------------------------

    for bank in banks:

        bank_data = bank.model_dump(
            mode="json"
        )

        # ----------------------------------------------------
        # DUPLICATE CHECK
        # ----------------------------------------------------

        existing = await (
            organ_banks_collection.find_one(
                {
                    "name": bank_data["name"],
                    "city": bank_data["city"],
                    "state": bank_data["state"],
                }
            )
        )

        if existing:
            duplicate_count += 1
            continue

        bank_data["created_at"] = now
        bank_data["updated_at"] = now

        documents.append(
            bank_data
        )

    # --------------------------------------------------------
    # NOTHING NEW
    # --------------------------------------------------------

    if not documents:

        current_count = await (
            organ_banks_collection.count_documents(
                {}
            )
        )

        return {
            "inserted_count": 0,
            "message": (
                "All provided Organ Bank records "
                "already exist."
            ),
            "total_collection_count": current_count,
            "records": [],
        }

    # --------------------------------------------------------
    # INSERT MANY
    # --------------------------------------------------------

    result = await (
        organ_banks_collection.insert_many(
            documents,
            ordered=False,
        )
    )

    # --------------------------------------------------------
    # VERIFY INSERTION
    # --------------------------------------------------------

    inserted_count = len(
        result.inserted_ids
    )

    # --------------------------------------------------------
    # FETCH INSERTED RECORDS
    # --------------------------------------------------------

    inserted_documents = await (
        organ_banks_collection.find(
            {
                "_id": {
                    "$in": result.inserted_ids
                }
            }
        )
        .sort(
            "created_at",
            -1,
        )
        .to_list(
            length=inserted_count
        )
    )

    records = [
        _serialize_document(
            document
        )
        for document in inserted_documents
    ]

    # --------------------------------------------------------
    # FINAL COLLECTION COUNT
    # --------------------------------------------------------

    total_collection_count = await (
        organ_banks_collection.count_documents(
            {}
        )
    )

    message = (
        f"{inserted_count} Organ Bank records "
        "inserted successfully."
    )

    if duplicate_count:

        message += (
            f" {duplicate_count} duplicate "
            "records were skipped."
        )

    return {
        "inserted_count": inserted_count,
        "total_collection_count": (
            total_collection_count
        ),
        "message": message,
        "records": records,
    }


# ============================================================
# GET ACTIVE ORGAN BANKS
# ============================================================

async def get_organ_banks(
    search: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
) -> list[dict]:

    query = {
        "is_active": True
    }

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:

        search_value = search.strip()

        if search_value:

            query["$or"] = [
                {
                    "name": {
                        "$regex": search_value,
                        "$options": "i",
                    }
                },
                {
                    "organization": {
                        "$regex": search_value,
                        "$options": "i",
                    }
                },
                {
                    "address": {
                        "$regex": search_value,
                        "$options": "i",
                    }
                },
                {
                    "city": {
                        "$regex": search_value,
                        "$options": "i",
                    }
                },
                {
                    "state": {
                        "$regex": search_value,
                        "$options": "i",
                    }
                },
            ]

    # --------------------------------------------------------
    # CITY
    # --------------------------------------------------------

    if city:

        city_value = city.strip()

        if city_value:
            query["city"] = {
                "$regex": city_value,
                "$options": "i",
            }

    # --------------------------------------------------------
    # STATE
    # --------------------------------------------------------

    if state:

        state_value = state.strip()

        if state_value:
            query["state"] = {
                "$regex": state_value,
                "$options": "i",
            }

    # --------------------------------------------------------
    # FETCH
    # --------------------------------------------------------

    cursor = (
        organ_banks_collection
        .find(query)
        .sort(
            [
                ("state", 1),
                ("city", 1),
                ("name", 1),
            ]
        )
    )

    documents = await cursor.to_list(
        length=5000
    )

    return [
        _serialize_document(
            document
        )
        for document in documents
    ]


# ============================================================
# GET ALL
# ============================================================

async def get_all_organ_banks() -> list[dict]:

    cursor = (
        organ_banks_collection
        .find({})
        .sort(
            [
                ("state", 1),
                ("city", 1),
                ("name", 1),
            ]
        )
    )

    documents = await cursor.to_list(
        length=5000
    )

    return [
        _serialize_document(
            document
        )
        for document in documents
    ]


# ============================================================
# GET BY ID
# ============================================================

async def get_organ_bank_by_id(
    bank_id: str,
) -> Optional[dict]:

    object_id = _get_object_id(
        bank_id
    )

    if object_id is None:
        return None

    document = await (
        organ_banks_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    return _serialize_document(
        document
    )


# ============================================================
# UPDATE
# ============================================================

async def update_organ_bank(
    bank_id: str,
    bank: OrganBankUpdate,
) -> Optional[dict]:

    object_id = _get_object_id(
        bank_id
    )

    if object_id is None:
        return None

    update_data = bank.model_dump(
        mode="json",
        exclude_unset=True,
    )

    if not update_data:

        return await get_organ_bank_by_id(
            bank_id
        )

    update_data["updated_at"] = (
        datetime.now(timezone.utc)
    )

    result = await (
        organ_banks_collection.update_one(
            {
                "_id": object_id
            },
            {
                "$set": update_data
            },
        )
    )

    if result.matched_count == 0:
        return None

    return await get_organ_bank_by_id(
        bank_id
    )


# ============================================================
# CHANGE STATUS
# ============================================================

async def change_organ_bank_status(
    bank_id: str,
    is_active: bool,
) -> Optional[dict]:

    object_id = _get_object_id(
        bank_id
    )

    if object_id is None:
        return None

    result = await (
        organ_banks_collection.update_one(
            {
                "_id": object_id
            },
            {
                "$set": {
                    "is_active": is_active,
                    "updated_at": (
                        datetime.now(
                            timezone.utc
                        )
                    ),
                }
            },
        )
    )

    if result.matched_count == 0:
        return None

    return await get_organ_bank_by_id(
        bank_id
    )


# ============================================================
# DELETE
# ============================================================

async def delete_organ_bank(
    bank_id: str,
) -> bool:

    object_id = _get_object_id(
        bank_id
    )

    if object_id is None:
        return False

    result = await (
        organ_banks_collection.delete_one(
            {
                "_id": object_id
            }
        )
    )

    return result.deleted_count > 0


# ============================================================
# COUNT
# ============================================================

async def get_organ_bank_count() -> int:

    return await (
        organ_banks_collection.count_documents(
            {
                "is_active": True
            }
        )
    )