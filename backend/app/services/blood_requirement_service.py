from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from app.db.mongodb import database
from app.schemas.blood_requirement import (
    BloodRequirementCreate,
    BloodRequirementStatus,
)


blood_requirements_collection = database["blood_requirements"]


# ============================================================
# HELPERS
# ============================================================

def _today_string() -> str:
    """
    Return today's UTC date in YYYY-MM-DD format.
    """
    return datetime.now(timezone.utc).date().isoformat()


def _normalize_required_date(value) -> str:
    """
    Normalize a stored required_date value to YYYY-MM-DD.
    """
    if value is None:
        return ""

    if hasattr(value, "isoformat"):
        value = value.isoformat()

    return str(value)[:10]


def _serialize_requirement(requirement: dict) -> dict:
    """
    Convert MongoDB document into JSON-safe response data.
    """

    requirement = dict(requirement)

    mongo_id = requirement.pop("_id", None)

    if mongo_id is not None:
        requirement["id"] = str(mongo_id)

    # --------------------------------------------------------
    # BACKWARD COMPATIBILITY
    # --------------------------------------------------------
    # Older records may not contain these fields.
    # Build them safely from existing data.
    # --------------------------------------------------------

    original_units = requirement.get(
        "original_units_required",
        requirement.get("units_required", 0),
    )

    units_fulfilled = requirement.get(
        "units_fulfilled",
        0,
    )

    remaining_units = requirement.get(
        "remaining_units",
        max(
            int(original_units or 0) - int(units_fulfilled or 0),
            0,
        ),
    )

    requirement["original_units_required"] = int(
        original_units or 0
    )

    requirement["units_fulfilled"] = int(
        units_fulfilled or 0
    )

    requirement["remaining_units"] = int(
        remaining_units or 0
    )

    # Older documents may not have donor_responses.
    if not isinstance(
        requirement.get("donor_responses"),
        list,
    ):
        requirement["donor_responses"] = []

    return requirement


# ============================================================
# CREATE BLOOD REQUIREMENT
# ============================================================

async def create_blood_requirement(
    requirement: BloodRequirementCreate,
    created_by_user_id: Optional[str] = None,
):
    """
    Create and store a new blood requirement.

    A new requirement starts with:

        original_units_required = requested units
        units_fulfilled = 0
        remaining_units = requested units
        status = active
        donor_responses = []

    Registration of a blood requirement does NOT create
    a blood donation.
    """

    now = datetime.now(timezone.utc)

    requirement_data = requirement.model_dump(
        mode="json"
    )

    units_required = int(
        requirement_data["units_required"]
    )

    # --------------------------------------------------------
    # INITIAL REQUEST TRACKING
    # --------------------------------------------------------

    requirement_data["original_units_required"] = (
        units_required
    )

    requirement_data["units_fulfilled"] = 0

    requirement_data["remaining_units"] = (
        units_required
    )

    requirement_data["donor_responses"] = []

    # --------------------------------------------------------
    # STATUS / AUDIT FIELDS
    # --------------------------------------------------------

    requirement_data[
        "status"
    ] = BloodRequirementStatus.ACTIVE.value

    requirement_data[
        "created_at"
    ] = now.isoformat()

    requirement_data[
        "updated_at"
    ] = now.isoformat()

    requirement_data[
        "created_by_user_id"
    ] = created_by_user_id

    # --------------------------------------------------------
    # INSERT
    # --------------------------------------------------------

    result = await blood_requirements_collection.insert_one(
        requirement_data
    )

    requirement_data["_id"] = result.inserted_id

    return _serialize_requirement(
        requirement_data
    )


# ============================================================
# GET ONE BLOOD REQUIREMENT
# ============================================================

async def get_blood_requirement_by_id(
    requirement_id: str,
):
    """
    Get one blood requirement by MongoDB ID.
    """

    if not ObjectId.is_valid(requirement_id):
        return None

    requirement = (
        await blood_requirements_collection.find_one(
            {
                "_id": ObjectId(requirement_id)
            }
        )
    )

    if requirement is None:
        return None

    return _serialize_requirement(
        requirement
    )


# ============================================================
# GET BLOOD REQUIREMENTS
# ============================================================

async def get_blood_requirements(
    blood_group: Optional[str] = None,
    status: Optional[str] = "active",
):
    """
    Get blood requirements for the Blood Requests page.

    For active requests:

    - expired required dates are excluded
    - fulfilled requests are excluded
    - cancelled requests are excluded

    Contact information is included because a donor needs
    the requester's contact information after choosing
    to donate.
    """

    query = {}

    if blood_group:
        query["blood_group"] = blood_group

    if status:
        query["status"] = status

    # --------------------------------------------------------
    # ACTIVE REQUESTS
    # --------------------------------------------------------
    # Do not return requests whose required date has already
    # passed.
    #
    # We keep the existing status enum unchanged.
    # Expiry is determined from required_date rather than
    # introducing a new database status.
    # --------------------------------------------------------

    if status == BloodRequirementStatus.ACTIVE.value:
        query["required_date"] = {
            "$gte": _today_string()
        }

    requirements = []

    cursor = blood_requirements_collection.find(
        query,
        {
            "_id": 1,

            # Blood requirement
            "blood_group": 1,
            "units_required": 1,
            "original_units_required": 1,
            "units_fulfilled": 1,
            "remaining_units": 1,

            # Hospital
            "hospital_name": 1,
            "hospital_city": 1,
            "hospital_state": 1,

            # Requirement
            "required_date": 1,
            "urgency": 1,
            "reason": 1,

            # Requester contact
            "contact_name": 1,
            "contact_phone": 1,

            # Status / audit
            "status": 1,
            "created_at": 1,
            "updated_at": 1,
            "created_by_user_id": 1,

            # Donation responses
            "donor_responses": 1,
        },
    )

    async for requirement in cursor:

        requirement = _serialize_requirement(
            requirement
        )

        # ----------------------------------------------------
        # SAFETY CHECK FOR OLD / INVALID RECORDS
        # ----------------------------------------------------

        if (
            status
            == BloodRequirementStatus.ACTIVE.value
        ):
            required_date = _normalize_required_date(
                requirement.get("required_date")
            )

            if (
                required_date
                and required_date < _today_string()
            ):
                continue

            if (
                requirement.get("remaining_units", 0)
                <= 0
            ):
                continue

        requirements.append(
            requirement
        )

    # --------------------------------------------------------
    # SORT RESULTS
    # --------------------------------------------------------
    # Emergency → Urgent → Normal
    # Then earliest required date.
    # --------------------------------------------------------

    urgency_priority = {
        "emergency": 0,
        "urgent": 1,
        "normal": 2,
    }

    requirements.sort(
        key=lambda item: (
            urgency_priority.get(
                str(
                    item.get(
                        "urgency",
                        "normal",
                    )
                ).lower(),
                3,
            ),
            _normalize_required_date(
                item.get("required_date")
            ),
            str(
                item.get(
                    "created_at",
                    "",
                )
            ),
        )
    )

    return requirements


# ============================================================
# GET MY BLOOD REQUIREMENTS (COMPLETE REQUEST HISTORY)
# ============================================================

async def get_my_blood_requirements(user_id: str):
    """
    Return every blood requirement created by one authenticated user.
    Includes active, fulfilled, cancelled, and date-expired records.
    Donor response snapshots remain attached to their original request.
    """
    if not user_id or not user_id.strip():
        return []

    requirements = []
    cursor = (
        blood_requirements_collection
        .find({"created_by_user_id": user_id.strip()})
        .sort("created_at", -1)
    )

    async for requirement in cursor:
        requirements.append(_serialize_requirement(requirement))

    return requirements


# ============================================================
# GET ALL BLOOD REQUIREMENTS
# ============================================================

async def get_all_blood_requirements():
    """
    Get all blood requirements.

    Intended for authorized/admin use.
    """

    requirements = []

    cursor = blood_requirements_collection.find().sort(
        "created_at",
        -1,
    )

    async for requirement in cursor:

        requirements.append(
            _serialize_requirement(
                requirement
            )
        )

    return requirements


# ============================================================
# UPDATE BLOOD REQUIREMENT STATUS
# ============================================================

async def update_blood_requirement_status(
    requirement_id: str,
    status: BloodRequirementStatus,
):
    """
    Update the status of a blood requirement.
    """

    if not ObjectId.is_valid(
        requirement_id
    ):
        return None

    now = datetime.now(
        timezone.utc
    ).isoformat()

    result = await blood_requirements_collection.update_one(
        {
            "_id": ObjectId(
                requirement_id
            )
        },
        {
            "$set": {
                "status": status.value,
                "updated_at": now,
            }
        },
    )

    if result.matched_count == 0:
        return None

    return await get_blood_requirement_by_id(
        requirement_id
    )


# ============================================================
# DELETE BLOOD REQUIREMENT
# ============================================================

async def delete_blood_requirement(
    requirement_id: str,
):
    """
    Delete a blood requirement.
    """

    if not ObjectId.is_valid(
        requirement_id
    ):
        return False

    result = await blood_requirements_collection.delete_one(
        {
            "_id": ObjectId(
                requirement_id
            )
        }
    )

    return result.deleted_count > 0