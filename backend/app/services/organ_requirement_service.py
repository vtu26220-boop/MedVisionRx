from datetime import date, datetime, time, timezone
from typing import Optional

from bson import ObjectId

from app.db.mongodb import database


# =========================================================
# COLLECTIONS
# =========================================================

organ_requirements_collection = database[
    "organ_requirements"
]

organ_requirement_responses_collection = database[
    "organ_requirement_responses"
]

organ_donations_collection = database[
    "organ_donations"
]

# Records created when a requester accepts a donor response.
# This is the source used later by Organ Donation History and
# Saved Organ Donors so the accepted relationship is not only
# stored in the requirement document.
organ_donation_history_collection = database[
    "organ_donation_history"
]


# =========================================================
# HELPERS
# =========================================================


def serialize_document(document):
    """
    Convert MongoDB/Python values into JSON-safe values.
    """

    if isinstance(document, ObjectId):
        return str(document)

    if isinstance(document, datetime):
        return document.isoformat()

    if isinstance(document, date):
        return document.isoformat()

    if isinstance(document, dict):
        return {
            key: serialize_document(value)
            for key, value in document.items()
        }

    if isinstance(document, list):
        return [
            serialize_document(value)
            for value in document
        ]

    return document


def make_id(value: str):
    try:
        return ObjectId(value)
    except Exception:
        return None


def utc_now():
    return datetime.now(timezone.utc)


def mongo_date(value):
    """
    MongoDB BSON supports datetime but not Python date.

    Convert:
        2026-09-29
    into:
        2026-09-29T00:00:00+00:00
    """

    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    if isinstance(value, date):
        return datetime.combine(
            value,
            time.min,
            tzinfo=timezone.utc,
        )

    return value


def normalize_organ(value: Optional[str]) -> str:
    if not value:
        return ""

    return (
        str(value)
        .strip()
        .lower()
        .replace("_", " ")
        .replace("-", " ")
    )


def donor_has_organ(
    donor_organs,
    requested_organ: str,
) -> bool:
    if not isinstance(
        donor_organs,
        list,
    ):
        return False

    requested = normalize_organ(
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
        if normalize_organ(organ) in requested_aliases:
            return True

    return False


# =========================================================
# CREATE ORGAN REQUIREMENT
# =========================================================


async def create_organ_requirement(
    requirement_data: dict,
    created_by_user_id: str,
):
    now = utc_now()

    units_required = int(
        requirement_data[
            "units_required"
        ]
    )

    required_date = mongo_date(
        requirement_data.get(
            "required_date"
        )
    )

    donation_type = requirement_data.get(
        "donation_type"
    )

    if hasattr(
        donation_type,
        "value",
    ):
        donation_type = (
            donation_type.value
        )

    urgency = requirement_data.get(
        "urgency"
    )

    if hasattr(
        urgency,
        "value",
    ):
        urgency = urgency.value

    document = {
        "organ_required":
            requirement_data[
                "organ_required"
            ],

        "donation_type":
            donation_type,

        "blood_group":
            requirement_data.get(
                "blood_group"
            ),

        "units_required":
            units_required,

        "original_units_required":
            units_required,

        "units_fulfilled":
            0,

        "remaining_units":
            units_required,

        "hospital_name":
            requirement_data[
                "hospital_name"
            ],

        "hospital_city":
            requirement_data[
                "hospital_city"
            ],

        "hospital_state":
            requirement_data[
                "hospital_state"
            ],

        "required_date":
            required_date,

        "urgency":
            urgency,

        "reason":
            requirement_data.get(
                "reason"
            ),

        "contact_name":
            requirement_data[
                "contact_name"
            ],

        "contact_phone":
            requirement_data[
                "contact_phone"
            ],

        "status":
            "active",

        "created_by_user_id":
            created_by_user_id,

        "donor_responses":
            [],

        "created_at":
            now,

        "updated_at":
            now,
    }

    result = (
        await organ_requirements_collection.insert_one(
            document
        )
    )

    document["_id"] = (
        result.inserted_id
    )

    return serialize_document(
        document
    )


# =========================================================
# GET ALL ORGAN REQUIREMENTS
# =========================================================


async def get_organ_requirements(
    status: Optional[str] = None,
    organ: Optional[str] = None,
    donation_type: Optional[str] = None,
    urgency: Optional[str] = None,
):
    query = {}

    if status:
        query["status"] = status

    if organ:
        query["organ_required"] = organ

    if donation_type:
        query["donation_type"] = (
            donation_type
        )

    if urgency:
        query["urgency"] = urgency

    cursor = (
        organ_requirements_collection
        .find(query)
        .sort(
            [
                (
                    "created_at",
                    -1,
                )
            ]
        )
    )

    requirements = await cursor.to_list(
        length=None
    )

    return [
        serialize_document(
            requirement
        )
        for requirement in requirements
    ]


# =========================================================
# GET SINGLE REQUIREMENT
# =========================================================


async def get_organ_requirement(
    requirement_id: str,
):
    object_id = make_id(
        requirement_id
    )

    if not object_id:
        return None

    requirement = (
        await organ_requirements_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    if not requirement:
        return None

    return serialize_document(
        requirement
    )


# =========================================================
# GET MY REQUIREMENTS
# =========================================================


async def get_my_organ_requirements(
    user_id: str,
):
    requirements = (
        await organ_requirements_collection
        .find(
            {
                "created_by_user_id":
                    user_id
            }
        )
        .sort(
            "created_at",
            -1,
        )
        .to_list(
            length=None
        )
    )

    return [
        serialize_document(
            requirement
        )
        for requirement in requirements
    ]


# =========================================================
# UPDATE REQUIREMENT
# =========================================================


async def update_organ_requirement(
    requirement_id: str,
    user_id: str,
    update_data: dict,
):
    object_id = make_id(
        requirement_id
    )

    if not object_id:
        return {
            "error":
                "invalid_requirement_id"
        }

    existing = (
        await organ_requirements_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    if not existing:
        return {
            "error":
                "organ_requirement_not_found"
        }

    owner_id = existing.get(
        "created_by_user_id"
    )

    if (
        owner_id
        and owner_id != user_id
    ):
        return {
            "error":
                "not_owner"
        }

    allowed_fields = {
        "organ_required",
        "donation_type",
        "blood_group",
        "hospital_name",
        "hospital_city",
        "hospital_state",
        "required_date",
        "urgency",
        "reason",
        "contact_name",
        "contact_phone",
    }

    updates = {}

    for key, value in update_data.items():

        if key not in allowed_fields:
            continue

        if value is None:
            continue

        if key == "required_date":
            value = mongo_date(value)

        if key == "donation_type":
            if hasattr(
                value,
                "value",
            ):
                value = value.value

        if key == "urgency":
            if hasattr(
                value,
                "value",
            ):
                value = value.value

        updates[key] = value

    if updates:
        updates[
            "updated_at"
        ] = utc_now()

        await organ_requirements_collection.update_one(
            {
                "_id": object_id
            },
            {
                "$set":
                    updates
            },
        )

    updated = (
        await organ_requirements_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    return serialize_document(
        updated
    )


# =========================================================
# CANCEL REQUIREMENT
# =========================================================


async def cancel_organ_requirement(
    requirement_id: str,
    user_id: str,
):
    object_id = make_id(
        requirement_id
    )

    if not object_id:
        return {
            "error":
                "invalid_requirement_id"
        }

    existing = (
        await organ_requirements_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    if not existing:
        return {
            "error":
                "organ_requirement_not_found"
        }

    owner_id = existing.get(
        "created_by_user_id"
    )

    if (
        owner_id
        and owner_id != user_id
    ):
        return {
            "error":
                "not_owner"
        }

    if (
        existing.get("status")
        == "fulfilled"
    ):
        return {
            "error":
                "already_fulfilled"
        }

    now = utc_now()

    await organ_requirements_collection.update_one(
        {
            "_id": object_id
        },
        {
            "$set": {
                "status":
                    "cancelled",
                "updated_at":
                    now,
            }
        },
    )

    await organ_requirement_responses_collection.update_many(
        {
            "requirement_id": requirement_id,
            "$or": [
                {"response_status": "pending"},
                {
                    "response_status": {
                        "$exists": False
                    },
                    "status": "pending",
                },
            ],
        },
        {
            "$set": {
                "response_status": "rejected",
                "status": "rejected",
                "updated_at": now,
            }
        },
    )

    await organ_requirements_collection.update_one(
        {
            "_id": object_id
        },
        {
            "$set": {
                "donor_responses.$[response].response_status":
                    "rejected",
                "donor_responses.$[response].status":
                    "rejected",
            }
        },
        array_filters=[
            {
                "response.response_status":
                    "pending"
            }
        ],
    )

    updated = (
        await organ_requirements_collection.find_one(
            {
                "_id": object_id
            }
        )
    )

    return serialize_document(
        updated
    )


# =========================================================
# DONOR RESPONDS TO REQUIREMENT
# =========================================================


async def create_organ_requirement_response(
    requirement_id: str,
    organ_donation_id: str,
):
    requirement_object_id = make_id(
        requirement_id
    )

    donation_object_id = make_id(
        organ_donation_id
    )

    if not requirement_object_id:
        return {
            "error":
                "invalid_requirement_id"
        }

    if not donation_object_id:
        return {
            "error":
                "invalid_donation_id"
        }

    requirement = (
        await organ_requirements_collection.find_one(
            {
                "_id":
                    requirement_object_id
            }
        )
    )

    if not requirement:
        return {
            "error":
                "organ_requirement_not_found"
        }

    if (
        requirement.get("status")
        != "active"
    ):
        return {
            "error":
                "organ_requirement_not_active"
        }

    if int(
        requirement.get(
            "remaining_units",
            0,
        )
    ) <= 0:
        return {
            "error":
                "organ_requirement_fulfilled"
        }

    donor = (
        await organ_donations_collection.find_one(
            {
                "_id":
                    donation_object_id
            }
        )
    )

    if not donor:
        return {
            "error":
                "organ_donation_not_found"
        }

    requested_organ = (
        requirement.get(
            "organ_required"
        )
    )

    donor_organs = donor.get(
        "organs",
        []
    )

    if not donor_has_organ(
        donor_organs,
        requested_organ,
    ):
        return {
            "error":
                "organ_not_pledged",
            "message":
                (
                    "This donor has not "
                    "pledged the requested "
                    "organ."
                ),
        }

    requirement_type = (
        requirement.get(
            "donation_type"
        )
    )

    donor_type = donor.get(
        "donation_type"
    )

    if (
        hasattr(
            requirement_type,
            "value",
        )
    ):
        requirement_type = (
            requirement_type.value
        )

    if (
        hasattr(
            donor_type,
            "value",
        )
    ):
        donor_type = donor_type.value

    if (
        requirement_type
        and donor_type
        and requirement_type
        != donor_type
    ):
        return {
            "error":
                "donation_type_mismatch"
        }

    existing = (
        await organ_requirement_responses_collection.find_one(
            {
                "requirement_id":
                    requirement_id,
                "organ_donation_id":
                    organ_donation_id,
            }
        )
    )

    if existing:
        return {
            "error":
                "already_responded",
            "id":
                str(
                    existing["_id"]
                ),
            "response_status":
                existing.get(
                    "response_status",
                    "pending",
                ),
        }

    now = utc_now()

    response = {
        "requirement_id":
            requirement_id,

        "organ_donation_id":
            organ_donation_id,

        # Frontend compatibility
        "donor_id":
            organ_donation_id,

        "requester_user_id":
            requirement.get(
                "created_by_user_id"
            ),

        "response_status":
            "pending",

        "status":
            "pending",

        "created_at":
            now,

        "updated_at":
            now,
    }

    result = (
        await organ_requirement_responses_collection.insert_one(
            response
        )
    )

    response["_id"] = (
        result.inserted_id
    )

    donor_response = {
        "response_id":
            str(
                result.inserted_id
            ),

        "organ_donation_id":
            organ_donation_id,

        # Frontend compatibility
        "donor_id":
            organ_donation_id,

        "response_status":
            "pending",

        "status":
            "pending",

        "created_at":
            now,
    }

    await organ_requirements_collection.update_one(
        {
            "_id":
                requirement_object_id
        },
        {
            "$push": {
                "donor_responses":
                    donor_response
            },
            "$set": {
                "updated_at":
                    now
            },
        },
    )

    return serialize_document(
        response
    )


# =========================================================
# GET DONOR RESPONSES
# =========================================================


async def get_organ_requirement_responses(
    requirement_id: str,
    requester_user_id: Optional[str] = None,
):
    requirement = (
        await get_organ_requirement(
            requirement_id
        )
    )

    if not requirement:
        return {
            "error":
                "organ_requirement_not_found"
        }

    owner_id = requirement.get(
        "created_by_user_id"
    )

    if (
        requester_user_id
        and owner_id
        and owner_id
        != requester_user_id
    ):
        return {
            "error":
                "not_owner"
        }

    responses = (
        await organ_requirement_responses_collection
        .find(
            {
                "requirement_id":
                    requirement_id
            }
        )
        .sort(
            "created_at",
            -1,
        )
        .to_list(
            length=None
        )
    )

    result = []

    for response in responses:

        donor_id = (
            response.get(
                "organ_donation_id"
            )
            or response.get(
                "donor_id"
            )
        )

        donor = None

        donor_object_id = make_id(
            donor_id
        )

        if donor_object_id:
            donor = (
                await organ_donations_collection.find_one(
                    {
                        "_id":
                            donor_object_id
                    }
                )
            )

        response_data = (
            serialize_document(
                response
            )
        )

        # Backward compatibility
        response_data[
            "status"
        ] = response_data.get(
            "response_status",
            response_data.get(
                "status",
                "pending",
            ),
        )

        if donor:
            response_data[
                "donor"
            ] = serialize_document(
                donor
            )

        result.append(
            response_data
        )

    return result


# =========================================================
# ACCEPT DONOR RESPONSE
# =========================================================


async def accept_organ_requirement_response(
    response_id: str,
    requester_user_id: str,
):
    response_object_id = make_id(
        response_id
    )

    if not response_object_id:
        return {
            "error":
                "invalid_response_id"
        }

    response = (
        await organ_requirement_responses_collection.find_one(
            {
                "_id":
                    response_object_id
            }
        )
    )

    if not response:
        return {
            "error":
                "response_not_found"
        }

    requirement_id = response.get(
        "requirement_id"
    )

    requirement = (
        await get_organ_requirement(
            requirement_id
        )
    )

    if not requirement:
        return {
            "error":
                "organ_requirement_not_found"
        }

    owner_id = requirement.get(
        "created_by_user_id"
    )

    if (
        owner_id
        and owner_id
        != requester_user_id
    ):
        return {
            "error":
                "not_owner"
        }

    response_status = (
        response.get(
            "response_status"
        )
        or response.get(
            "status"
        )
        or "pending"
    )

    if response_status != "pending":
        return {
            "error":
                "response_not_pending"
        }

    if (
        requirement.get("status")
        != "active"
    ):
        return {
            "error":
                "organ_requirement_not_active"
        }

    remaining_units = int(
        requirement.get(
            "remaining_units",
            0,
        )
    )

    if remaining_units <= 0:
        return {
            "error":
                "organ_requirement_fulfilled"
        }

    now = utc_now()

    # -----------------------------------------------------
    # ACCEPT RESPONSE
    # -----------------------------------------------------

    # Atomically claim the response only while it is still pending.
    # This prevents two requester actions from accepting the same
    # donor response at the same time.
    claim_result = await organ_requirement_responses_collection.update_one(
        {
            "_id": response_object_id,
            "$or": [
                {"response_status": "pending"},
                {
                    "response_status": {
                        "$exists": False
                    },
                    "status": "pending",
                },
            ],
        },
        {
            "$set": {
                "response_status": "accepted",
                "status": "accepted",
                "accepted_at": now,
                "updated_at": now,
            }
        },
    )

    if claim_result.modified_count == 0:
        return {
            "error":
                "response_not_pending"
        }

    # -----------------------------------------------------
    # UPDATE REQUIREMENT
    # -----------------------------------------------------

    current_fulfilled = int(
        requirement.get(
            "units_fulfilled",
            0,
        )
    )

    new_fulfilled = (
        current_fulfilled + 1
    )

    new_remaining = max(
        remaining_units - 1,
        0,
    )

    new_status = (
        "fulfilled"
        if new_remaining == 0
        else "active"
    )

    requirement_object_id = make_id(
        requirement_id
    )

    await organ_requirements_collection.update_one(
        {
            "_id":
                requirement_object_id
        },
        {
            "$set": {
                "units_fulfilled":
                    new_fulfilled,
                "remaining_units":
                    new_remaining,
                "status":
                    new_status,
                "updated_at":
                    now,
            }
        },
    )

    # -----------------------------------------------------
    # UPDATE EMBEDDED RESPONSE
    # -----------------------------------------------------

    await organ_requirements_collection.update_one(
        {
            "_id":
                requirement_object_id,
            "donor_responses.response_id":
                response_id,
        },
        {
            "$set": {
                "donor_responses.$.response_status":
                    "accepted",
                "donor_responses.$.status":
                    "accepted",
                "donor_responses.$.accepted_at":
                    now,
            }
        },
    )

    # -----------------------------------------------------
    # IF FULLY FULFILLED, REJECT OTHER PENDING RESPONSES
    # -----------------------------------------------------

    if new_remaining == 0:

        await organ_requirement_responses_collection.update_many(
            {
                "requirement_id":
                    requirement_id,
                "response_status":
                    "pending",
            },
            {
                "$set": {
                    "response_status":
                        "rejected",
                    "status":
                        "rejected",
                    "rejected_at":
                        now,
                    "updated_at":
                        now,
                }
            },
        )

        await organ_requirements_collection.update_one(
            {
                "_id":
                    requirement_object_id
            },
            {
                "$set": {
                    "donor_responses.$[response].response_status":
                        "rejected",
                    "donor_responses.$[response].status":
                        "rejected",
                    "donor_responses.$[response].rejected_at":
                        now,
                }
            },
            array_filters=[
                {
                    "response.response_status":
                        "pending"
                }
            ],
        )

    updated_response = (
        await organ_requirement_responses_collection.find_one(
            {
                "_id":
                    response_object_id
            }
        )
    )

    # -----------------------------------------------------
    # SAVE ACCEPTED DONATION HISTORY
    # -----------------------------------------------------
    # Keep a separate immutable-ish transaction record. The
    # original donor response and requirement are still kept
    # exactly as before; this record gives the Organ Donation
    # service a reliable source for Requests / Saved Donors /
    # History pages.

    donor_id = (
        response.get("organ_donation_id")
        or response.get("donor_id")
    )

    donor = None
    donor_object_id = make_id(donor_id)
    if donor_object_id:
        donor = await organ_donations_collection.find_one(
            {"_id": donor_object_id}
        )

    existing_history = None
    if donor_id:
        existing_history = (
            await organ_donation_history_collection.find_one(
                {
                    "response_id": response_id,
                    "status": "accepted",
                }
            )
        )

    if existing_history and donor:
        await organ_donation_history_collection.update_one(
            {"_id": existing_history["_id"]},
            {
                "$set": {
                    "donor_user_id": (
                        donor.get("user_id")
                        or donor.get("created_by_user_id")
                    ),
                    "organ_donation_id": donor_id,
                    "updated_at": now,
                }
            },
        )

    if not existing_history:
        history_document = {
            "response_id": response_id,
            "requirement_id": requirement_id,
            "organ_donation_id": donor_id,
            "donor_id": donor_id,
            "requester_user_id": requester_user_id,
            "donor_user_id": (
                donor.get("user_id") or donor.get("created_by_user_id")
                if donor else None
            ),
            "status": "accepted",
            "organ": requirement.get("organ_required"),
            "organ_required": requirement.get("organ_required"),
            "donation_type": requirement.get("donation_type"),
            "blood_group": (
                donor.get("blood_group")
                if donor else requirement.get("blood_group")
            ),
            "hospital_name": requirement.get("hospital_name"),
            "hospital_city": requirement.get("hospital_city"),
            "hospital_state": requirement.get("hospital_state"),
            "required_date": requirement.get("required_date"),
            "units": 1,
            "accepted_at": now,
            "created_at": now,
            "updated_at": now,
            # Snapshot the donor and requirement at acceptance
            # so History remains useful even if the live donor
            # profile is edited later.
            "donor_snapshot": serialize_document(donor) if donor else None,
            "requirement_snapshot": {
                "id": requirement_id,
                "organ_required": requirement.get("organ_required"),
                "donation_type": requirement.get("donation_type"),
                "blood_group": requirement.get("blood_group"),
                "hospital_name": requirement.get("hospital_name"),
                "hospital_city": requirement.get("hospital_city"),
                "hospital_state": requirement.get("hospital_state"),
                "urgency": requirement.get("urgency"),
                "contact_name": requirement.get("contact_name"),
                "contact_phone": requirement.get("contact_phone"),
            },
        }

        await organ_donation_history_collection.insert_one(
            history_document
        )

    # Also keep a small accepted-donation reference on the donor
    # profile. This does not replace the history collection; it
    # makes the donor record immediately aware of accepted links.
    if donor_object_id:
        await organ_donations_collection.update_one(
            {"_id": donor_object_id},
            {
                "$set": {
                    "last_accepted_at": now,
                    "updated_at": now,
                },
                "$addToSet": {
                    "accepted_requirement_ids": requirement_id,
                    "accepted_response_ids": response_id,
                },
            },
        )

    return serialize_document(
        updated_response
    )


# =========================================================
# ACCEPTED DONORS / DONATION HISTORY HELPERS
# =========================================================


async def get_accepted_donors_for_requirement(
    requirement_id: str,
    requester_user_id: Optional[str] = None,
):
    """
    Return accepted donor records for a requirement.

    This is intentionally backed by the response collection and
    the organ_donations collection, with the history collection
    used as the accepted-transaction record.
    """
    requirement = await get_organ_requirement(requirement_id)

    if not requirement:
        return {"error": "organ_requirement_not_found"}

    owner_id = requirement.get("created_by_user_id")
    if (
        requester_user_id
        and owner_id
        and owner_id != requester_user_id
    ):
        return {"error": "not_owner"}

    responses = await organ_requirement_responses_collection.find(
        {
            "requirement_id": requirement_id,
            "response_status": "accepted",
        }
    ).sort("accepted_at", -1).to_list(length=None)

    result = []

    for response in responses:
        donor_id = (
            response.get("organ_donation_id")
            or response.get("donor_id")
        )
        donor = None
        donor_object_id = make_id(donor_id)

        if donor_object_id:
            donor = await organ_donations_collection.find_one(
                {"_id": donor_object_id}
            )

        item = serialize_document(response)
        item["status"] = item.get(
            "response_status",
            item.get("status", "accepted"),
        )
        item["donor"] = serialize_document(donor) if donor else None
        result.append(item)

    return result


async def get_organ_donation_history(
    user_id: Optional[str] = None,
    donor_id: Optional[str] = None,
    requirement_id: Optional[str] = None,
):
    """
    Read accepted organ-donation transactions.

    user_id refers to the donor's user id when available. For
    older records, donor_id can still be used directly.
    """
    query = {"status": "accepted"}

    if requirement_id:
        query["requirement_id"] = requirement_id

    if user_id:
        donor_cursor = organ_donations_collection.find(
            {"user_id": user_id}
        )
        donor_records = await donor_cursor.to_list(length=None)
        donor_ids = [str(item.get("_id")) for item in donor_records]

        if not donor_ids:
            return []

        query["organ_donation_id"] = {"$in": donor_ids}

    elif donor_id:
        query["organ_donation_id"] = donor_id

    history = (
        await organ_donation_history_collection
        .find(query)
        .sort("accepted_at", -1)
        .to_list(length=None)
    )

    result = []

    for item in history:
        item_data = serialize_document(item)

        donor_ref = (
            item.get("organ_donation_id")
            or item.get("donor_id")
        )
        donor_object_id = make_id(donor_ref)
        donor = None

        if donor_object_id:
            donor = await organ_donations_collection.find_one(
                {"_id": donor_object_id}
            )

        item_data["donor"] = serialize_document(donor) if donor else item_data.get("donor_snapshot")
        result.append(item_data)

    return result


# =========================================================
# REJECT DONOR RESPONSE
# =========================================================


async def reject_organ_requirement_response(
    response_id: str,
    requester_user_id: str,
):
    response_object_id = make_id(
        response_id
    )

    if not response_object_id:
        return {
            "error":
                "invalid_response_id"
        }

    response = (
        await organ_requirement_responses_collection.find_one(
            {
                "_id":
                    response_object_id
            }
        )
    )

    if not response:
        return {
            "error":
                "response_not_found"
        }

    requirement_id = response.get(
        "requirement_id"
    )

    requirement = (
        await get_organ_requirement(
            requirement_id
        )
    )

    if not requirement:
        return {
            "error":
                "organ_requirement_not_found"
        }

    owner_id = requirement.get(
        "created_by_user_id"
    )

    if (
        owner_id
        and owner_id
        != requester_user_id
    ):
        return {
            "error":
                "not_owner"
        }

    response_status = (
        response.get(
            "response_status"
        )
        or response.get(
            "status"
        )
        or "pending"
    )

    if response_status != "pending":
        return {
            "error":
                "response_not_pending"
        }

    now = utc_now()

    await organ_requirement_responses_collection.update_one(
        {
            "_id":
                response_object_id
        },
        {
            "$set": {
                "response_status":
                    "rejected",
                "status":
                    "rejected",
                "rejected_at":
                    now,
                "updated_at":
                    now,
            }
        },
    )

    requirement_object_id = make_id(
        requirement_id
    )

    if requirement_object_id:

        await organ_requirements_collection.update_one(
            {
                "_id":
                    requirement_object_id,
                "donor_responses.response_id":
                    response_id,
            },
            {
                "$set": {
                    "donor_responses.$.response_status":
                        "rejected",
                    "donor_responses.$.status":
                        "rejected",
                    "donor_responses.$.rejected_at":
                        now,
                    "donor_responses.$.updated_at":
                        now,
                }
            },
        )

    updated = (
        await organ_requirement_responses_collection.find_one(
            {
                "_id":
                    response_object_id
            }
        )
    )

    return serialize_document(
        updated
    )