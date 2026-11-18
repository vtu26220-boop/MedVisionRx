from datetime import datetime, timezone
from collections import Counter

from bson import ObjectId


def _serialize_mongo(value):
    """Recursively convert MongoDB ObjectId values to JSON-safe strings."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _serialize_mongo(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize_mongo(item) for item in value]
    if isinstance(value, tuple):
        return [_serialize_mongo(item) for item in value]
    return value

from app.db.mongodb import database
from app.schemas.blood_donor import (
    BloodDonorCreate,
    BloodDonationCreate,
)


# ============================================================
# COLLECTIONS
# ============================================================

blood_donors_collection = database["blood_donors"]
blood_donations_collection = database["blood_donations"]
blood_requirements_collection = database["blood_requirements"]


# ============================================================
# CREATE BLOOD DONOR
# ============================================================

async def create_blood_donor(
    donor: BloodDonorCreate,
    current_user_id: str,
):
    """
    Create exactly one blood donor profile for a user.

    The authenticated Firebase UID is supplied by the router after
    server-side ID-token verification. A client-provided user_id is ignored.
    Email/phone remain secondary duplicate safeguards.
    """

    donor_data = donor.model_dump(mode="json")

    user_id = current_user_id.strip()
    if not user_id:
        raise ValueError("Authenticated user ID is required.")
    donor_data["user_id"] = user_id
    email = donor_data.get("email")
    phone = donor_data.get("phone")

    existing_donor = await blood_donors_collection.find_one({"user_id": user_id})
    if existing_donor is not None:
        existing_id = existing_donor.pop("_id")
        existing_donor["id"] = str(existing_id)
        return {
            "already_exists": True,
            "message": "Blood donor registration already exists.",
            **existing_donor,
        }

    duplicate_conditions = []
    if email:
        duplicate_conditions.append({"email": email.strip().lower()})
    if phone:
        duplicate_conditions.append({"phone": phone.strip()})
    if duplicate_conditions:
        duplicate = await blood_donors_collection.find_one({"$or": duplicate_conditions})
        if duplicate is not None:
            return {
                "duplicate": True,
                "message": "This email or phone number is already registered.",
            }

    if email:
        donor_data["email"] = email.strip().lower()

    if phone:
        donor_data["phone"] = phone.strip()

    now = datetime.now(timezone.utc).isoformat()

    donor_data["verification_status"] = "verified"
    donor_data["created_at"] = now
    donor_data["updated_at"] = now

    donor_data["total_donations"] = 0
    donor_data["last_donation_date"] = None

    result = await blood_donors_collection.insert_one(
        donor_data
    )

    return {
        "id": str(result.inserted_id),
        "already_exists": False,
        "message": "Blood donor registration created successfully.",
        **donor_data,
    }


# ============================================================
# GET BLOOD DONOR BY ID
# ============================================================

async def get_blood_donor_by_id(
    donor_id: str,
    current_user_id: str | None = None,
):
    if not ObjectId.is_valid(donor_id):
        return None

    donor_query = {"_id": ObjectId(donor_id)}
    if current_user_id is not None:
        donor_query["user_id"] = current_user_id
    donor = await blood_donors_collection.find_one(donor_query)

    if donor is None:
        return None

    donor["id"] = str(
        donor.pop("_id")
    )

    return donor


# ============================================================
# GET BLOOD DONOR BY USER ID
# ============================================================

async def get_blood_donor_by_user_id(user_id: str):
    if not user_id or not user_id.strip():
        return None
    donor = await blood_donors_collection.find_one({"user_id": user_id.strip()})
    if donor is None:
        return None
    donor["id"] = str(donor.pop("_id"))
    return donor


# ============================================================
# GET BLOOD DONOR BY EMAIL OR PHONE
# ============================================================

async def get_blood_donor_by_contact(
    email: str | None = None,
    phone: str | None = None,
    current_user_id: str | None = None,
):
    conditions = []

    if email:
        conditions.append(
            {
                "email": email.strip().lower()
            }
        )

    if phone:
        conditions.append(
            {
                "phone": phone.strip()
            }
        )

    if not conditions:
        return None

    if current_user_id:
        donor = await blood_donors_collection.find_one(
            {"user_id": current_user_id, "$or": conditions}
        )
    else:
        return None

    if donor is None:
        return None

    donor["id"] = str(
        donor.pop("_id")
    )

    return donor


# ============================================================
# UPDATE BLOOD DONOR
# ============================================================

async def update_blood_donor(
    donor_id: str,
    donor: BloodDonorCreate,
    current_user_id: str,
):
    if not ObjectId.is_valid(donor_id):
        return None

    existing_donor = await blood_donors_collection.find_one(
        {
            "_id": ObjectId(donor_id),
            "user_id": current_user_id,
        }
    )

    if existing_donor is None:
        return None

    donor_data = donor.model_dump(mode="json")
    donor_data["user_id"] = current_user_id

    email = donor_data.get("email")
    phone = donor_data.get("phone")

    if email:
        donor_data["email"] = email.strip().lower()

    if phone:
        donor_data["phone"] = phone.strip()

    duplicate_conditions = []

    if donor_data.get("email"):
        duplicate_conditions.append(
            {
                "email": donor_data["email"]
            }
        )

    if donor_data.get("phone"):
        duplicate_conditions.append(
            {
                "phone": donor_data["phone"]
            }
        )

    if duplicate_conditions:
        another_donor = await blood_donors_collection.find_one(
            {
                "$and": [
                    {
                        "_id": {
                            "$ne": ObjectId(donor_id)
                        }
                    },
                    {
                        "$or": duplicate_conditions
                    },
                ]
            }
        )

        if another_donor is not None:
            return {
                "duplicate": True,
                "message": (
                    "Another donor registration already "
                    "uses this email or phone number."
                ),
            }

    donor_data.pop("verification_status", None)
    donor_data.pop("created_at", None)
    donor_data.pop("updated_at", None)

    existing_total_donations = existing_donor.get(
        "total_donations",
        0,
    )

    existing_last_donation_date = existing_donor.get(
        "last_donation_date"
    )

    donor_data["total_donations"] = existing_total_donations
    donor_data["last_donation_date"] = existing_last_donation_date

    donor_data["updated_at"] = datetime.now(
        timezone.utc
    ).isoformat()

    await blood_donors_collection.update_one(
        {
            "_id": ObjectId(donor_id),
            "user_id": current_user_id,
        },
        {"$set": donor_data},
    )

    updated = await blood_donors_collection.find_one({"_id": ObjectId(donor_id), "user_id": current_user_id})
    if updated is None:
        return None
    updated["id"] = str(updated.pop("_id"))
    return updated


# ============================================================
# GET ALL BLOOD DONORS
# ============================================================

async def get_all_blood_donors():
    donors = []
    projection = {
        "full_name": 1,
        "blood_group": 1,
        "city": 1,
        "state": 1,
        "phone": 1,
        "availability": 1,
        "verification_status": 1,
        "created_at": 1,
        "previous_donations": 1,
        "total_donations": 1,
        "last_donation_date": 1,
    }
    cursor = blood_donors_collection.find({}, projection).sort("created_at", -1)
    async for donor in cursor:
        donor["id"] = str(donor.pop("_id"))
        donors.append(donor)
    return donors


# ============================================================
# BLOOD DONATION DASHBOARD STATISTICS
# ============================================================

async def get_blood_donation_dashboard_stats(
    user_id: str | None = None,
):
    donors = []

    donor_query = {}

    if user_id and user_id.strip():
        donor_query = {
            "user_id": user_id.strip()
        }

    cursor = blood_donors_collection.find(
        donor_query
    ).sort(
        "created_at",
        -1,
    )

    async for donor in cursor:
        donor["id"] = str(
            donor.pop("_id")
        )
        donors.append(donor)

    if not donors:
        return {
            "total_donors": 0,
            "available_donors": 0,
            "blood_group_counts": {},
            "registrations_by_month": [],
            "latest_donor": None,
        }

    total_donors = len(donors)

    available_donors = sum(
        1
        for donor in donors
        if donor.get("availability") is True
    )

    blood_group_counter = Counter()

    for donor in donors:
        blood_group = donor.get(
            "blood_group"
        )

        if blood_group:
            blood_group_counter[
                blood_group
            ] += 1

    blood_group_counts = dict(
        sorted(
            blood_group_counter.items()
        )
    )

    monthly_counter = Counter()

    for donor in donors:
        created_at = donor.get(
            "created_at"
        )

        if not created_at:
            continue

        try:
            created_date = datetime.fromisoformat(
                created_at.replace(
                    "Z",
                    "+00:00",
                )
            )

            month_key = created_date.strftime(
                "%Y-%m"
            )

            monthly_counter[
                month_key
            ] += 1

        except (
            ValueError,
            TypeError,
        ):
            continue

    registrations_by_month = []

    for month_key in sorted(
        monthly_counter.keys()
    ):
        month_date = datetime.strptime(
            month_key,
            "%Y-%m",
        )

        registrations_by_month.append(
            {
                "month": month_date.strftime(
                    "%b %Y"
                ),
                "count": monthly_counter[
                    month_key
                ],
            }
        )

    latest_donor = donors[0]

    latest_donor_data = {
        "id": latest_donor.get(
            "id"
        ),
        "full_name": latest_donor.get(
            "full_name"
        ),
        "blood_group": latest_donor.get(
            "blood_group"
        ),
        "city": latest_donor.get(
            "city"
        ),
        "state": latest_donor.get(
            "state"
        ),
        "availability": latest_donor.get(
            "availability"
        ),
        "created_at": latest_donor.get(
            "created_at"
        ),
        "previous_donations": latest_donor.get(
            "previous_donations",
            0,
        ),
        "total_donations": latest_donor.get(
            "total_donations",
            0,
        ),
        "last_donation_date": latest_donor.get(
            "last_donation_date"
        ),
    }

    return {
        "total_donors": total_donors,
        "available_donors": available_donors,
        "blood_group_counts": blood_group_counts,
        "registrations_by_month": registrations_by_month,
        "latest_donor": latest_donor_data,
    }


# ============================================================
# CREATE BLOOD DONATION RESPONSE
# ============================================================

async def create_blood_donation(
    donation: BloodDonationCreate,
    current_user_id: str,
):
    """
    Donor clicks Donate Blood.

    This creates a PENDING response.

    It does NOT immediately count as an actual donation.

    The requester must later select this donor using
    "Accept This User".
    """

    if not ObjectId.is_valid(donation.donor_id):
        return None

    if not ObjectId.is_valid(donation.blood_requirement_id):
        return None

    donor_object_id = ObjectId(donation.donor_id)
    requirement_object_id = ObjectId(
        donation.blood_requirement_id
    )

    donor = await blood_donors_collection.find_one(
        {"_id": donor_object_id, "user_id": current_user_id}
    )

    if donor is None:
        return {"error": "not_owner", "message": "You can only respond using your own donor profile."}

    requirement = await blood_requirements_collection.find_one(
        {"_id": requirement_object_id}
    )

    if requirement is None:
        return {
            "error": "blood_requirement_not_found",
            "message": "The selected blood requirement was not found.",
        }

    if requirement.get("status") != "active":
        return {
            "error": "blood_requirement_not_active",
            "message": "This blood requirement is no longer active.",
        }

    donor_blood_group = donor.get("blood_group")
    request_blood_group = requirement.get("blood_group")
    donation_blood_group = donation.blood_group

    if (
        donor_blood_group
        and donation_blood_group
        and donor_blood_group != donation_blood_group
    ):
        return {
            "error": "blood_group_mismatch",
            "message": "The donation blood group does not match the donor profile.",
        }

    if (
        request_blood_group
        and donation_blood_group
        and request_blood_group != donation_blood_group
    ):
        return {
            "error": "blood_group_mismatch",
            "message": (
                "The selected blood requirement requires "
                f"{request_blood_group} blood."
            ),
        }

    original_units = int(
        requirement.get(
            "original_units_required",
            requirement.get("units_required", 0),
        )
    )

    units_fulfilled = int(
        requirement.get("units_fulfilled", 0)
    )

    remaining_units = max(
        original_units - units_fulfilled,
        0,
    )

    if remaining_units <= 0:
        return {
            "error": "blood_requirement_fulfilled",
            "message": "This blood requirement has already been fulfilled.",
        }

    units_to_offer = 1

    existing_donation = await blood_donations_collection.find_one(
        {
            "donor_id": donation.donor_id,
            "blood_requirement_id": donation.blood_requirement_id,
        }
    )

    now = datetime.now(timezone.utc).isoformat()

    request_data = {
        "request_hospital_name": requirement.get(
            "hospital_name"
        ),
        "request_hospital_city": requirement.get(
            "hospital_city"
        ),
        "request_hospital_state": requirement.get(
            "hospital_state"
        ),
        "request_required_date": requirement.get(
            "required_date"
        ),
        "request_urgency": requirement.get(
            "urgency"
        ),
        "requester_name": requirement.get(
            "contact_name"
        ),
        "requester_phone": requirement.get(
            "contact_phone"
        ),
        "donor_address": donor.get("address"),
        "donor_city": donor.get("city"),
        "donor_state": donor.get("state"),
        "donor_pincode": donor.get("pincode"),
    }

    if existing_donation is not None:
        existing_status = str(
            existing_donation.get("status", "")
        ).lower()

        if existing_status in {
            "pending",
            "accepted",
            "donated",
        }:
            return {
                "error": "already_donated",
                "message": (
                    "You have already responded to this "
                    "blood requirement."
                ),
                "id": str(existing_donation["_id"]),
                "response_status": existing_status,
            }

        await blood_donations_collection.update_one(
            {"_id": existing_donation["_id"]},
            {
                "$set": {
                    **donation.model_dump(mode="json"),
                    "units": units_to_offer,
                    "status": "pending",
                    "response_status": "pending",
                    "responded_at": now,
                    "accepted_at": None,
                    "rejected_at": None,
                    "created_at": existing_donation.get(
                        "created_at",
                        now
                    ),
                    **request_data,
                }
            },
        )

        donation_id = str(
            existing_donation["_id"]
        )

        donor_response = {
            "donation_id": donation_id,
            "donor_id": donation.donor_id,
            "donor_name": donor.get(
                "full_name"
            ),
            "blood_group": donor.get(
                "blood_group"
            ),
            "units": units_to_offer,
            "status": "pending",
            "responded_at": now,
            "requester_name": requirement.get(
                "contact_name"
            ),
            "requester_phone": requirement.get(
                "contact_phone"
            ),
        }

        old_responses = requirement.get(
            "donor_responses",
            []
        )

        updated_responses = [
            item
            for item in old_responses
            if item.get("donation_id") != donation_id
        ]

        updated_responses.append(
            donor_response
        )

        await blood_requirements_collection.update_one(
            {"_id": requirement_object_id},
            {
                "$set": {
                    "donor_responses": updated_responses,
                    "updated_at": now,
                }
            },
        )

        return {
            "id": donation_id,
            "donor_id": donation.donor_id,
            "blood_requirement_id": (
                donation.blood_requirement_id
            ),
            "blood_group": donor.get(
                "blood_group"
            ),
            "units": units_to_offer,
            "donation_date": donation.donation_date,
            "status": "pending",
            "response_status": "pending",
            "request_status": requirement.get(
                "status"
            ),
            "units_fulfilled": units_fulfilled,
            "remaining_units": remaining_units,
            **request_data,
        }

    donation_data = donation.model_dump(
        mode="json"
    )

    donation_data["units"] = units_to_offer
    donation_data["status"] = "pending"
    donation_data["response_status"] = "pending"
    donation_data["responded_at"] = now
    donation_data["accepted_at"] = None
    donation_data["rejected_at"] = None
    donation_data["created_at"] = now

    donation_data.update(
        request_data
    )

    result = await blood_donations_collection.insert_one(
        donation_data
    )

    donation_id = str(
        result.inserted_id
    )

    donor_response = {
        "donation_id": donation_id,
        "donor_id": donation.donor_id,
        "donor_name": donor.get(
            "full_name"
        ),
        "blood_group": donor.get(
            "blood_group"
        ),
        "units": units_to_offer,
        "status": "pending",
        "responded_at": now,
        "requester_name": requirement.get(
            "contact_name"
        ),
        "requester_phone": requirement.get(
            "contact_phone"
        ),
    }

    await blood_requirements_collection.update_one(
        {"_id": requirement_object_id},
        {
            "$push": {
                "donor_responses": donor_response,
            },
            "$set": {
                "updated_at": now,
            },
        },
    )

    return {
        "id": donation_id,
        **donation_data,
        "request_status": requirement.get(
            "status"
        ),
        "units_fulfilled": units_fulfilled,
        "remaining_units": remaining_units,
        "response_status": "pending",
    }


# ============================================================
# GET DONOR RESPONSES FOR REQUIREMENT
# ============================================================

async def get_blood_requirement_donor_responses(
    requirement_id: str,
    requester_user_id: str | None = None,
):
    if not ObjectId.is_valid(requirement_id):
        return None

    requirement = await blood_requirements_collection.find_one(
        {"_id": ObjectId(requirement_id)}
    )

    if requirement is None:
        return None

    created_by_user_id = requirement.get(
        "created_by_user_id"
    )

    if not requester_user_id or not created_by_user_id or requester_user_id != created_by_user_id:
        return {
            "error": "not_owner",
            "message": (
                "You are not the owner of this "
                "blood requirement."
            ),
        }

    original_units = int(
        requirement.get(
            "original_units_required",
            requirement.get("units_required", 0),
        )
    )

    responses = requirement.get(
        "donor_responses",
        []
    )

    result = []

    for response in responses:
        donation_id = response.get(
            "donation_id"
        )

        donor_id = response.get(
            "donor_id"
        )

        donation = None
        donor = None

        if (
            donation_id
            and ObjectId.is_valid(donation_id)
        ):
            donation = await blood_donations_collection.find_one(
                {
                    "_id": ObjectId(donation_id)
                }
            )

        if (
            donor_id
            and ObjectId.is_valid(donor_id)
        ):
            donor = await blood_donors_collection.find_one(
                {
                    "_id": ObjectId(donor_id)
                }
            )

        if donation is not None:
            response_status = str(
                donation.get(
                    "status",
                    response.get(
                        "status",
                        "pending"
                    ),
                )
            ).lower()
        else:
            response_status = str(
                response.get(
                    "status",
                    "pending"
                )
            ).lower()

        result.append(
            {
                "donation_id": donation_id,
                "donor_id": donor_id,
                "donor_name": (
                    donor.get("full_name")
                    if donor
                    else response.get(
                        "donor_name"
                    )
                ),
                "blood_group": (
                    donor.get("blood_group")
                    if donor
                    else response.get(
                        "blood_group"
                    )
                ),
                "phone": (
                    donor.get("phone")
                    if donor
                    else None
                ),
                "email": (
                    donor.get("email")
                    if donor
                    else None
                ),
                "address": (
                    donor.get("address")
                    if donor
                    else None
                ),
                "city": (
                    donor.get("city")
                    if donor
                    else None
                ),
                "state": (
                    donor.get("state")
                    if donor
                    else None
                ),
                "pincode": (
                    donor.get("pincode")
                    if donor
                    else None
                ),
                "weight_kg": (
                    donor.get("weight_kg")
                    if donor
                    else None
                ),
                "availability": (
                    donor.get("availability")
                    if donor
                    else None
                ),
                "verification_status": (
                    donor.get(
                        "verification_status"
                    )
                    if donor
                    else None
                ),
                "donation_date": (
                    donation.get(
                        "donation_date"
                    )
                    if donation
                    else response.get(
                        "donation_date"
                    )
                ),
                "units": (
                    donation.get(
                        "units",
                        1
                    )
                    if donation
                    else response.get(
                        "units",
                        1
                    )
                ),
                "status": response_status,
                "responded_at": (
                    donation.get(
                        "responded_at"
                    )
                    if donation
                    else response.get(
                        "responded_at"
                    )
                ),
                "accepted_at": (
                    donation.get(
                        "accepted_at"
                    )
                    if donation
                    else None
                ),
                "requester_name": requirement.get(
                    "contact_name"
                ),
                "requester_phone": requirement.get(
                    "contact_phone"
                ),
            }
        )

    result.sort(
        key=lambda item: (
            0
            if item["status"] == "pending"
            else 1,
            item.get(
                "responded_at"
            ) or "",
        )
    )

    return {
        "requirement_id": requirement_id,
        "blood_group": requirement.get(
            "blood_group"
        ),
        "units_required": original_units,
        "units_fulfilled": int(
            requirement.get(
                "units_fulfilled",
                0
            )
        ),
        "remaining_units": int(
            requirement.get(
                "remaining_units",
                original_units
                - int(
                    requirement.get(
                        "units_fulfilled",
                        0
                    )
                ),
            )
        ),
        "status": requirement.get(
            "status"
        ),
        "donors": result,
    }


# ============================================================
# ACCEPT ONE DONOR RESPONSE
# ============================================================

async def accept_blood_donation_response(
    donation_id: str,
    requester_user_id: str | None = None,
):
    if not ObjectId.is_valid(donation_id):
        return None

    donation = await blood_donations_collection.find_one(
        {
            "_id": ObjectId(donation_id)
        }
    )

    if donation is None:
        return None

    requirement_id = donation.get(
        "blood_requirement_id"
    )

    if (
        not requirement_id
        or not ObjectId.is_valid(requirement_id)
    ):
        return {
            "error": "blood_requirement_not_found",
            "message": (
                "The blood requirement linked to this "
                "response was not found."
            ),
        }

    requirement = await blood_requirements_collection.find_one(
        {
            "_id": ObjectId(requirement_id)
        }
    )

    if requirement is None:
        return {
            "error": "blood_requirement_not_found",
            "message": (
                "The blood requirement linked to this "
                "response was not found."
            ),
        }

    created_by_user_id = requirement.get(
        "created_by_user_id"
    )

    if not requester_user_id or not created_by_user_id or requester_user_id != created_by_user_id:
        return {
            "error": "not_owner",
            "message": (
                "You are not the owner of this "
                "blood requirement."
            ),
        }

    donation_status = str(
        donation.get(
            "status",
            "pending"
        )
    ).lower()

    if donation_status == "accepted":
        return {
            "error": "already_accepted",
            "message": (
                "This donor has already been accepted "
                "for the requirement."
            ),
        }

    if donation_status != "pending":
        return {
            "error": "response_not_pending",
            "message": (
                "This donor response is no longer pending."
            ),
        }

    original_units = int(
        requirement.get(
            "original_units_required",
            requirement.get(
                "units_required",
                0
            ),
        )
    )

    units_fulfilled = int(
        requirement.get(
            "units_fulfilled",
            0
        )
    )

    remaining_units = max(
        original_units - units_fulfilled,
        0,
    )

    units = int(
        donation.get(
            "units",
            1
        ) or 1
    )

    if remaining_units < units:
        return {
            "error": "insufficient_units",
            "message": (
                "There are not enough remaining "
                "units for this donor."
            ),
        }

    now = datetime.now(
        timezone.utc
    ).isoformat()

    new_units_fulfilled = (
        units_fulfilled + units
    )

    new_remaining_units = max(
        original_units - new_units_fulfilled,
        0,
    )

    new_requirement_status = (
        "fulfilled"
        if new_remaining_units == 0
        else "active"
    )

    await blood_donations_collection.update_one(
        {
            "_id": ObjectId(donation_id)
        },
        {
            "$set": {
                "status": "accepted",
                "response_status": "accepted",
                "accepted_at": now,
                "donation_date": now,
                "updated_at": now,
            }
        },
    )

    donor_id = donation.get(
        "donor_id"
    )

    if (
        donor_id
        and ObjectId.is_valid(donor_id)
    ):
        donor = await blood_donors_collection.find_one(
            {
                "_id": ObjectId(donor_id)
            }
        )

        if donor is not None:
            current_total = int(
                donor.get(
                    "total_donations",
                    0
                )
            )

            await blood_donors_collection.update_one(
                {
                    "_id": ObjectId(donor_id)
                },
                {
                    "$set": {
                        "total_donations": (
                            current_total + 1
                        ),
                        "last_donation_date": now,
                        "updated_at": now,
                    }
                },
            )

    donor_responses = requirement.get(
        "donor_responses",
        []
    )

    updated_responses = []

    for response in donor_responses:
        if response.get(
            "donation_id"
        ) == donation_id:
            updated_responses.append(
                {
                    **response,
                    "status": "accepted",
                    "accepted_at": now,
                    "donation_date": now,
                }
            )
        else:
            updated_responses.append(
                response
            )

    if new_remaining_units == 0:
        updated_responses = [
            {
                **response,
                "status": (
                    "rejected"
                    if response.get(
                        "status"
                    ) == "pending"
                    else response.get(
                        "status"
                    )
                ),
                "rejected_at": (
                    now
                    if response.get(
                        "status"
                    ) == "pending"
                    else response.get(
                        "rejected_at"
                    )
                ),
            }
            for response in updated_responses
        ]

    await blood_requirements_collection.update_one(
        {
            "_id": ObjectId(requirement_id)
        },
        {
            "$set": {
                "units_fulfilled": new_units_fulfilled,
                "remaining_units": new_remaining_units,
                "status": new_requirement_status,
                "donor_responses": updated_responses,
                "updated_at": now,
            }
        },
    )

    updated_donation = await blood_donations_collection.find_one(
        {
            "_id": ObjectId(donation_id)
        }
    )

    if updated_donation is None:
        return None

    updated_donation["id"] = str(
        updated_donation.pop("_id")
    )

    updated_donation["request_status"] = (
        new_requirement_status
    )

    updated_donation["units_fulfilled"] = (
        new_units_fulfilled
    )

    updated_donation["remaining_units"] = (
        new_remaining_units
    )

    return updated_donation


# ============================================================
# REJECT ONE DONOR RESPONSE
# ============================================================

async def reject_blood_donation_response(
    donation_id: str,
    requester_user_id: str | None = None,
):
    if not ObjectId.is_valid(donation_id):
        return None

    donation = await blood_donations_collection.find_one(
        {
            "_id": ObjectId(donation_id)
        }
    )

    if donation is None:
        return None

    requirement_id = donation.get(
        "blood_requirement_id"
    )

    if (
        not requirement_id
        or not ObjectId.is_valid(requirement_id)
    ):
        return None

    requirement = await blood_requirements_collection.find_one(
        {
            "_id": ObjectId(requirement_id)
        }
    )

    if requirement is None:
        return None

    created_by_user_id = requirement.get(
        "created_by_user_id"
    )

    if not requester_user_id or not created_by_user_id or requester_user_id != created_by_user_id:
        return {
            "error": "not_owner",
            "message": (
                "You are not the owner of this "
                "blood requirement."
            ),
        }

    if str(
        donation.get(
            "status",
            ""
        )
    ).lower() != "pending":
        return {
            "error": "response_not_pending",
            "message": (
                "This donor response is no longer pending."
            ),
        }

    now = datetime.now(
        timezone.utc
    ).isoformat()

    await blood_donations_collection.update_one(
        {
            "_id": ObjectId(donation_id)
        },
        {
            "$set": {
                "status": "rejected",
                "response_status": "rejected",
                "rejected_at": now,
                "updated_at": now,
            }
        },
    )

    donor_responses = requirement.get(
        "donor_responses",
        []
    )

    updated_responses = [
        {
            **response,
            "status": (
                "rejected"
                if response.get(
                    "donation_id"
                ) == donation_id
                else response.get(
                    "status",
                    "pending"
                )
            ),
            "rejected_at": (
                now
                if response.get(
                    "donation_id"
                ) == donation_id
                else response.get(
                    "rejected_at"
                )
            ),
        }
        for response in donor_responses
    ]

    await blood_requirements_collection.update_one(
        {
            "_id": ObjectId(requirement_id)
        },
        {
            "$set": {
                "donor_responses": updated_responses,
                "updated_at": now,
            }
        },
    )

    return {
        "id": donation_id,
        "status": "rejected",
        "message": "Donor response rejected.",
    }


# ============================================================
# GET DONATION HISTORY
# ============================================================

async def get_donation_history(
    donor_id: str,
    current_user_id: str,
):
    if not ObjectId.is_valid(donor_id):
        return None

    donor = await blood_donors_collection.find_one(
        {"_id": ObjectId(donor_id), "user_id": current_user_id}
    )

    if donor is None:
        return None

    all_records = []

    cursor = blood_donations_collection.find(
        {
            "donor_id": donor_id
        }
    ).sort(
        [
            ("responded_at", -1),
            ("accepted_at", -1),
            ("created_at", -1),
        ]
    )

    async for record in cursor:
        record["id"] = str(
            record.pop("_id")
        )

        # MongoDB ObjectIds can also exist inside legacy/nested fields.
        # Convert every nested ObjectId before FastAPI serializes the response.
        all_records.append(
            _serialize_mongo(record)
        )

    actual_donations = [
        record
        for record in all_records
        if str(
            record.get(
                "status",
                ""
            )
        ).lower()
        in {
            "accepted",
            "donated",
        }
    ]

    responses = [
        record
        for record in all_records
        if str(
            record.get(
                "status",
                ""
            )
        ).lower()
        in {
            "pending",
            "rejected",
        }
    ]

    return {
        "donor_id": donor_id,
        "donor_name": donor.get(
            "full_name"
        ),
        "blood_group": donor.get(
            "blood_group"
        ),
        "total_donations": len(
            actual_donations
        ),
        "donations": actual_donations,
        "responses": responses,
    }


async def _owned_donor_ids(current_user_id: str):
    owned = await blood_donors_collection.find({"user_id": current_user_id}, {"_id": 1}).to_list(length=None)
    return [str(item["_id"]) for item in owned]


# ============================================================
# TEMPORARY LATEST DONATION HISTORY
# ============================================================

async def get_latest_donation_history(current_user_id: str):
    latest_donation = (
        await blood_donations_collection.find_one(
            {
                "status": {"$in": ["accepted", "donated"]},
                "donor_id": {"$in": await _owned_donor_ids(current_user_id)},
            },
            sort=[
                (
                    "donation_date",
                    -1,
                ),
                (
                    "created_at",
                    -1,
                ),
            ],
        )
    )

    if latest_donation is None:
        return {
            "donor_id": "",
            "donor_name": None,
            "blood_group": None,
            "total_donations": 0,
            "donations": [],
            "responses": [],
        }

    donor_id = latest_donation.get(
        "donor_id"
    )

    if not donor_id:
        return None

    return await get_donation_history(
        donor_id, current_user_id
    )


# ============================================================
# DELETE BLOOD DONATION / RESPONSE
# ============================================================

async def delete_blood_donation(
    donation_id: str,
    current_user_id: str,
):
    if not ObjectId.is_valid(donation_id):
        return False

    donation_object_id = ObjectId(
        donation_id
    )

    donation = await blood_donations_collection.find_one(
        {
            "_id": donation_object_id
        }
    )

    if donation is None:
        return False

    donor_id = donation.get(
        "donor_id"
    )

    requirement_id = donation.get(
        "blood_requirement_id"
    )

    donation_status = str(donation.get("status", "")).lower()

    donor_owner = await blood_donors_collection.find_one(
        {"_id": ObjectId(donor_id), "user_id": current_user_id}
    ) if donor_id and ObjectId.is_valid(donor_id) else None
    requirement_owner = await blood_requirements_collection.find_one(
        {"_id": ObjectId(requirement_id), "created_by_user_id": current_user_id}
    ) if requirement_id and ObjectId.is_valid(requirement_id) else None
    if donor_owner is None and requirement_owner is None:
        return False

    result = await blood_donations_collection.delete_one(
        {
            "_id": donation_object_id
        }
    )

    if result.deleted_count == 0:
        return False

    now = datetime.now(
        timezone.utc
    ).isoformat()

    requirement = None

    if (
        requirement_id
        and ObjectId.is_valid(
            requirement_id
        )
    ):
        requirement = await blood_requirements_collection.find_one(
            {
                "_id": ObjectId(
                    requirement_id
                )
            }
        )

    if requirement is not None:
        donor_responses = requirement.get(
            "donor_responses",
            []
        )

        updated_responses = [
            response
            for response in donor_responses
            if response.get(
                "donation_id"
            ) != donation_id
        ]

        update_data = {
            "donor_responses": updated_responses,
            "updated_at": now,
        }

        if donation_status in {
            "accepted",
            "donated",
        }:
            units = int(
                donation.get(
                    "units",
                    1
                )
            )

            original_units = int(
                requirement.get(
                    "original_units_required",
                    requirement.get(
                        "units_required",
                        0
                    ),
                )
            )

            current_fulfilled = int(
                requirement.get(
                    "units_fulfilled",
                    0
                )
            )

            new_fulfilled = max(
                current_fulfilled - units,
                0,
            )

            new_remaining = max(
                original_units - new_fulfilled,
                0,
            )

            update_data.update(
                {
                    "units_fulfilled": new_fulfilled,
                    "remaining_units": new_remaining,
                    "status": (
                        "fulfilled"
                        if new_remaining == 0
                        else "active"
                    ),
                }
            )

        await blood_requirements_collection.update_one(
            {
                "_id": ObjectId(
                    requirement_id
                )
            },
            {
                "$set": update_data
            },
        )

    if (
        donation_status in {
            "accepted",
            "donated",
        }
        and donor_id
        and ObjectId.is_valid(
            donor_id
        )
    ):
        donor = await blood_donors_collection.find_one(
            {
                "_id": ObjectId(
                    donor_id
                )
            }
        )

        if donor:
            current_total = int(
                donor.get(
                    "total_donations",
                    0
                )
            )

            new_total = max(
                current_total - 1,
                0,
            )

            latest_remaining = await blood_donations_collection.find_one(
                {
                    "donor_id": donor_id,
                    "status": {
                        "$in": [
                            "accepted",
                            "donated",
                        ]
                    },
                },
                sort=[
                    (
                        "donation_date",
                        -1,
                    ),
                    (
                        "accepted_at",
                        -1,
                    ),
                    (
                        "created_at",
                        -1,
                    ),
                ],
            )

            latest_date = (
                latest_remaining.get(
                    "donation_date"
                )
                if latest_remaining
                else None
            )

            await blood_donors_collection.update_one(
                {
                    "_id": ObjectId(
                        donor_id
                    )
                },
                {
                    "$set": {
                        "total_donations": new_total,
                        "last_donation_date": latest_date,
                        "updated_at": now,
                    }
                },
            )

    return True