from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongodb import database
from app.schemas.organ_donation import (
    OrganDonationCreate,
    OrganDonationStatus,
)


# =========================================================
# COLLECTIONS
# =========================================================

organ_donations_collection = database[
    "organ_donations"
]

organ_requirements_collection = database[
    "organ_requirements"
]

organ_requirement_responses_collection = database[
    "organ_requirement_responses"
]

organ_donation_history_collection = database[
    "organ_donation_history"
]


# =========================================================
# SERIALIZATION
# =========================================================

def _serialize_value(value):
    if isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            key: _serialize_value(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            _serialize_value(item)
            for item in value
        ]

    return value


def _serialize_document(
    document: Optional[dict],
) -> Optional[dict]:

    if not document:
        return document

    result = _serialize_value(
        document.copy()
    )

    if "_id" in result:
        result["id"] = str(
            result.pop("_id")
        )

    return result


# =========================================================
# OBJECT ID
# =========================================================

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


# =========================================================
# NORMALIZATION
# =========================================================

def _normalize(value) -> str:

    if value is None:
        return ""

    return (
        str(value)
        .strip()
        .lower()
        .replace("_", " ")
        .replace("-", " ")
    )


def _enum_value(value):

    if hasattr(value, "value"):
        return value.value

    return value


# =========================================================
# ORGAN MATCHING
# =========================================================

def _donor_has_organ(
    donor_organs,
    requested_organ,
) -> bool:

    if not isinstance(
        donor_organs,
        list,
    ):
        return False

    requested = _normalize(
        requested_organ
    )

    aliases = {
        "kidney": {
            "kidney",
            "kidneys",
        },
        "liver": {
            "liver",
        },
        "heart": {
            "heart",
        },
        "lung": {
            "lung",
            "lungs",
        },
        "pancreas": {
            "pancreas",
        },
        "intestine": {
            "intestine",
        },
        "cornea": {
            "cornea",
            "corneas",
        },
        "skin": {
            "skin",
        },
        "bone": {
            "bone",
        },
        "heart valve": {
            "heart valve",
            "heart valves",
        },
    }

    requested_aliases = aliases.get(
        requested,
        {requested},
    )

    for organ in donor_organs:

        if (
            _normalize(organ)
            in requested_aliases
        ):
            return True

    return False


# =========================================================
# CREATE / REGISTER ORGAN DONATION
# =========================================================

async def create_organ_donation(
    donation: OrganDonationCreate,
    created_by_user_id: Optional[str] = None,
) -> dict:
    """
    Create or update the current user's organ donor registration.

    Both user_id and created_by_user_id are written for compatibility
    with existing MedVisionRx records and older frontend versions.
    """
    now = datetime.now(timezone.utc)
    donation_data = donation.model_dump(mode="json")

    donation_data["status"] = OrganDonationStatus.ACTIVE.value
    donation_data["updated_at"] = now

    owner_id = (
        str(created_by_user_id).strip()
        if created_by_user_id is not None
        else ""
    )

    if owner_id:
        donation_data["user_id"] = owner_id
        donation_data["created_by_user_id"] = owner_id

        # Match records created by current and previous app versions.
        owner_query = {
            "$or": [
                {"user_id": owner_id},
                {"created_by_user_id": owner_id},
                {"firebase_uid": owner_id},
                {"uid": owner_id},
                {"userId": owner_id},
                {"owner_id": owner_id},
                {"user.uid": owner_id},
                {"user.id": owner_id},
                {"user._id": owner_id},
            ]
        }

        existing = await organ_donations_collection.find_one(
            owner_query,
            sort=[("created_at", -1)],
        )

        if existing:
            await organ_donations_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": donation_data},
            )
            updated_document = await organ_donations_collection.find_one(
                {"_id": existing["_id"]}
            )
            if not updated_document:
                raise RuntimeError(
                    "The organ donor profile was updated but could not be retrieved."
                )
            return _serialize_document(updated_document)

    donation_data["created_at"] = now
    result = await organ_donations_collection.insert_one(donation_data)
    created_document = await organ_donations_collection.find_one(
        {"_id": result.inserted_id}
    )

    if not created_document:
        raise RuntimeError(
            "Organ donation pledge was created but could not be retrieved."
        )

    return _serialize_document(created_document)


# =========================================================
# GET ONE ORGAN DONATION
# =========================================================

async def get_organ_donation_by_id(
    donation_id: str,
) -> Optional[dict]:

    object_id = _get_object_id(
        donation_id
    )

    if not object_id:
        return None

    document = (
        await organ_donations_collection.find_one(
            {
                "_id":
                    object_id,
            }
        )
    )

    if not document:
        return None

    return _serialize_document(
        document
    )


# =========================================================
# GET CURRENT USER'S ORGAN DONATION
# =========================================================

async def get_user_organ_donation(
    user_id: str,
) -> Optional[dict]:
    """
    Return the latest organ donor registration owned by user_id.

    Searches the owner fields used by current and legacy MedVisionRx
    versions. Status is intentionally not filtered so cancelled or
    inactive registrations remain visible on the donor's dashboard.
    """
    owner_id = str(user_id or "").strip()
    if not owner_id:
        return None

    document = await organ_donations_collection.find_one(
        {
            "$or": [
                {"user_id": owner_id},
                {"created_by_user_id": owner_id},
                {"firebase_uid": owner_id},
                {"uid": owner_id},
                {"userId": owner_id},
                {"owner_id": owner_id},
                {"user.uid": owner_id},
                {"user.id": owner_id},
                {"user._id": owner_id},
            ]
        },
        sort=[("created_at", -1)],
    )

    if not document:
        return None

    return _serialize_document(document)


# =========================================================
# GET ACTIVE ORGAN DONATIONS
# =========================================================

async def get_active_organ_donations(
    donation_type: Optional[str] = None,
) -> list[dict]:

    query = {
        "status":
            OrganDonationStatus.ACTIVE.value
    }

    if donation_type:

        query[
            "donation_type"
        ] = donation_type

    cursor = (
        organ_donations_collection
        .find(query)
        .sort(
            "created_at",
            -1,
        )
    )

    documents = await cursor.to_list(
        length=500
    )

    return [
        _serialize_document(
            document
        )
        for document in documents
    ]


# =========================================================
# GET ALL ORGAN DONATIONS
# =========================================================

async def get_all_organ_donations() -> list[dict]:

    cursor = (
        organ_donations_collection
        .find({})
        .sort(
            "created_at",
            -1,
        )
    )

    documents = await cursor.to_list(
        length=1000
    )

    return [
        _serialize_document(
            document
        )
        for document in documents
    ]


# =========================================================
# GET ORGAN DONATION REQUESTS FOR DONOR
# =========================================================

async def get_donor_organ_requests(
    user_id: str,
) -> list[dict]:
    """
    Gets active organ requirements that match
    the current donor's pledged organs.

    It also attaches the donor's existing response
    so the frontend can display:

        Not Responded
        Pending
        Accepted
        Rejected
    """

    donor = await get_user_organ_donation(
        user_id
    )

    if not donor:

        raise ValueError(
            "You must register as an organ donor "
            "before viewing organ donation requests."
        )

    donor_id = donor.get(
        "id"
    )

    if not donor_id:
        return []

    if (
        donor.get("status")
        != OrganDonationStatus.ACTIVE.value
    ):
        return []

    donor_organs = donor.get(
        "organs",
        [],
    )

    donor_type = _enum_value(
        donor.get(
            "donation_type"
        )
    )

    requirements = (
        await organ_requirements_collection
        .find(
            {
                "status":
                    {
                        "$in":
                            [
                                "active",
                                "partially_fulfilled",
                            ]
                    }
            }
        )
        .sort(
            "created_at",
            -1,
        )
        .to_list(
            length=500
        )
    )

    results = []

    for requirement in requirements:

        requested_organ = (
            requirement.get(
                "organ_required"
            )
        )

        # -------------------------------------------------
        # ORGAN MATCH
        # -------------------------------------------------

        if not _donor_has_organ(
            donor_organs,
            requested_organ,
        ):
            continue

        # -------------------------------------------------
        # DONATION TYPE MATCH
        # -------------------------------------------------

        requirement_type = _enum_value(
            requirement.get(
                "donation_type"
            )
        )

        if (
            requirement_type
            and donor_type
            and requirement_type
            != donor_type
        ):
            continue

        requirement_id = str(
            requirement["_id"]
        )

        # -------------------------------------------------
        # FIND EXISTING RESPONSE
        # -------------------------------------------------

        response = (
            await organ_requirement_responses_collection
            .find_one(
                {
                    "requirement_id":
                        requirement_id,
                    "organ_donation_id":
                        donor_id,
                }
            )
        )

        response_data = (
            _serialize_document(
                response
            )
            if response
            else None
        )

        if response_data:

            response_status = _normalize(
                response_data.get(
                    "response_status"
                )
                or response_data.get(
                    "status"
                )
                or "pending"
            ).replace(" ", "_")

        else:

            response_status = (
                "not_responded"
            )

        results.append(
            {
                "id":
                    requirement_id,

                "requirement_id":
                    requirement_id,

                "requirement":
                    _serialize_document(
                        requirement
                    ),

                "response_id":
                    (
                        response_data.get(
                            "id"
                        )
                        if response_data
                        else None
                    ),

                "response_status":
                    response_status,

                "status":
                    response_status,

                "can_respond":
                    response_status
                    in {
                        "not_responded",
                        "not responded",
                    },

                "donor":
                    donor,
            }
        )

    return results


# =========================================================
# CREATE HISTORY FROM ACCEPTED RESPONSE
# =========================================================

async def _create_history_from_response(
    response: dict,
) -> Optional[dict]:
    """
    Creates a permanent history record for an
    accepted donor response.

    The operation is idempotent.
    """

    response_id = str(
        response.get("_id")
        or response.get("id")
        or ""
    )

    if not response_id:
        return None

    existing = (
        await organ_donation_history_collection
        .find_one(
            {
                "response_id":
                    response_id,
            }
        )
    )

    if existing:

        return _serialize_document(
            existing
        )

    donation_id = (
        response.get(
            "organ_donation_id"
        )
        or response.get(
            "donor_id"
        )
    )

    requirement_id = response.get(
        "requirement_id"
    )

    if (
        not donation_id
        or not requirement_id
    ):
        return None

    donor_object_id = _get_object_id(
        donation_id
    )

    requirement_object_id = _get_object_id(
        requirement_id
    )

    donor = None
    requirement = None

    # -----------------------------------------------------
    # DONOR
    # -----------------------------------------------------

    if donor_object_id:

        donor = (
            await organ_donations_collection
            .find_one(
                {
                    "_id":
                        donor_object_id,
                }
            )
        )

    # -----------------------------------------------------
    # REQUIREMENT
    # -----------------------------------------------------

    if requirement_object_id:

        requirement = (
            await organ_requirements_collection
            .find_one(
                {
                    "_id":
                        requirement_object_id,
                }
            )
        )

    now = datetime.now(
        timezone.utc
    )

    history_document = {
        "response_id":
            response_id,

        "organ_donation_id":
            donation_id,

        "donor_user_id":
            (
                donor.get(
                    "user_id"
                )
                if donor
                else None
            ),

        "requirement_id":
            requirement_id,

        "requester_user_id":
            (
                requirement.get(
                    "created_by_user_id"
                )
                if requirement
                else response.get(
                    "requester_user_id"
                )
            ),

        "status":
            "accepted",

        "accepted_at":
            (
                response.get(
                    "accepted_at"
                )
                or now
            ),

        "created_at":
            now,

        "updated_at":
            now,

        "donor_snapshot":
            (
                _serialize_document(
                    donor
                )
                if donor
                else None
            ),

        "requirement_snapshot":
            (
                _serialize_document(
                    requirement
                )
                if requirement
                else None
            ),
    }

    try:
        result = (
            await organ_donation_history_collection
            .insert_one(
                history_document
            )
        )
        history_document["_id"] = (
            result.inserted_id
        )
        return _serialize_document(
            history_document
        )
    except Exception as exc:
        # A concurrent recovery request may have created the same
        # history record after the first existence check.
        existing = (
            await organ_donation_history_collection
            .find_one(
                {
                    "response_id":
                        response_id,
                }
            )
        )
        if existing:
            return _serialize_document(
                existing
            )
        raise exc


# =========================================================
# GET ORGAN DONATION HISTORY
# =========================================================

async def get_organ_donation_history(
    user_id: str,
) -> list[dict]:
    """
    Returns accepted donation history for the
    current donor.

    Also recovers accepted responses that were created
    before the history collection was introduced.
    """

    donor = await get_user_organ_donation(
        user_id
    )

    if not donor:
        return []

    donor_id = donor.get(
        "id"
    )

    if not donor_id:
        return []

    # -----------------------------------------------------
    # BACKFILL OWNER ID ON HISTORY CREATED BY THE
    # ORGAN REQUIREMENT SERVICE
    # -----------------------------------------------------

    # Older acceptance records may not contain donor_user_id.
    # Link those records to the current donor using the
    # donor profile's MongoDB ID before querying history.
    await organ_donation_history_collection.update_many(
        {
            "$and": [
                {
                    "$or": [
                        {"organ_donation_id": donor_id},
                        {"donor_id": donor_id},
                    ]
                },
                {
                    "$or": [
                        {"donor_user_id": {"$exists": False}},
                        {"donor_user_id": None},
                        {"donor_user_id": ""},
                    ]
                },
            ]
        },
        {
            "$set": {
                "donor_user_id": user_id,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    # -----------------------------------------------------
    # RECOVER ACCEPTED RESPONSES
    # -----------------------------------------------------

    accepted_responses = (
        await organ_requirement_responses_collection
        .find(
            {
                "$and": [
                    {
                        "$or": [
                            {"organ_donation_id": donor_id},
                            {"donor_id": donor_id},
                        ]
                    },
                    {
                        "$or": [
                            {"response_status": "accepted"},
                            {"status": "accepted"},
                        ]
                    },
                ]
            }
        )
        .sort(
            "accepted_at",
            -1,
        )
        .to_list(
            length=500
        )
    )

    for response in accepted_responses:

        await _create_history_from_response(
            response
        )

    # -----------------------------------------------------
    # LOAD HISTORY
    # -----------------------------------------------------

    history = (
        await organ_donation_history_collection
        .find(
            {
                "donor_user_id":
                    user_id,
            }
        )
        .sort(
            "accepted_at",
            -1,
        )
        .to_list(
            length=500
        )
    )

    return [
        _serialize_document(
            document
        )
        for document in history
    ]


# =========================================================
# UPDATE STATUS
# =========================================================

async def update_organ_donation_status(
    donation_id: str,
    status: OrganDonationStatus,
) -> Optional[dict]:

    object_id = _get_object_id(
        donation_id
    )

    if not object_id:
        return None

    now = datetime.now(
        timezone.utc
    )

    result = (
        await organ_donations_collection
        .update_one(
            {
                "_id":
                    object_id,
            },
            {
                "$set":
                    {
                        "status":
                            status.value,

                        "updated_at":
                            now,
                    }
            },
        )
    )

    if result.matched_count == 0:
        return None

    return await get_organ_donation_by_id(
        donation_id
    )


# =========================================================
# CANCEL ORGAN DONATION
# =========================================================

async def cancel_organ_donation(
    donation_id: str,
) -> Optional[dict]:

    return await update_organ_donation_status(
        donation_id,
        OrganDonationStatus.CANCELLED,
    )


# =========================================================
# REACTIVATE ORGAN DONATION
# =========================================================

async def reactivate_organ_donation(
    donation_id: str,
) -> Optional[dict]:

    return await update_organ_donation_status(
        donation_id,
        OrganDonationStatus.ACTIVE,
    )


# =========================================================
# DELETE ORGAN DONATION
# =========================================================

async def delete_organ_donation(
    donation_id: str,
) -> bool:

    object_id = _get_object_id(
        donation_id
    )

    if not object_id:
        return False

    result = (
        await organ_donations_collection
        .delete_one(
            {
                "_id":
                    object_id,
            }
        )
    )

    return (
        result.deleted_count > 0
    )


# =========================================================
# CREATE INDEXES
# =========================================================

async def create_organ_donation_indexes():

    await organ_donations_collection.create_index(
        "user_id"
    )

    await organ_donations_collection.create_index(
        [
            ("user_id", 1),
            ("created_at", -1),
        ]
    )

    await organ_donations_collection.create_index(
        "status"
    )

    await organ_donations_collection.create_index(
        "donation_type"
    )

    await organ_donations_collection.create_index(
        "created_at"
    )

    await organ_donations_collection.create_index(
        [
            ("status", 1),
            ("donation_type", 1),
        ]
    )

    await organ_donation_history_collection.create_index(
        "response_id",
        unique=True,
    )

    await organ_donation_history_collection.create_index(
        "donor_user_id"
    )

    await organ_donation_history_collection.create_index(
        "organ_donation_id"
    )

    await organ_donation_history_collection.create_index(
        "accepted_at"
    )