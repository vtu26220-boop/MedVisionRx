from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# =========================================================
# ENUMS
# =========================================================


class OrganRequirementDonationType(str, Enum):
    LIVING = "living"
    DECEASED = "deceased"


class OrganRequirementUrgency(str, Enum):
    NORMAL = "normal"
    URGENT = "urgent"
    EMERGENCY = "emergency"


class OrganRequirementStatus(str, Enum):
    ACTIVE = "active"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


# =========================================================
# ALLOWED ORGANS
# =========================================================

ALLOWED_ORGANS = {
    "Kidneys",
    "Liver",
    "Heart",
    "Lungs",
    "Pancreas",
    "Intestine",
    "Corneas",
    "Skin",
    "Bone",
    "Heart Valves",
}


# =========================================================
# ORGAN ALIASES
# =========================================================

ORGAN_ALIASES = {
    "kidney": "Kidneys",
    "kidneys": "Kidneys",

    "liver": "Liver",

    "heart": "Heart",

    "lung": "Lungs",
    "lungs": "Lungs",

    "pancreas": "Pancreas",

    "intestine": "Intestine",

    "cornea": "Corneas",
    "corneas": "Corneas",

    "skin": "Skin",

    "bone": "Bone",

    "heart valve": "Heart Valves",
    "heart valves": "Heart Valves",
}


# =========================================================
# CREATE ORGAN REQUIREMENT
# =========================================================


class OrganRequirementCreate(BaseModel):

    organ_required: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    donation_type: OrganRequirementDonationType

    blood_group: Optional[str] = Field(
        default=None,
        max_length=5,
    )

    units_required: int = Field(
        ...,
        ge=1,
        le=20,
    )

    hospital_name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    hospital_city: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    hospital_state: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    required_date: date

    urgency: OrganRequirementUrgency

    # OPTIONAL
    reason: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    contact_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    contact_phone: str = Field(
        ...,
        min_length=10,
        max_length=15,
    )

    # =====================================================
    # ORGAN VALIDATION
    # =====================================================

    @field_validator("organ_required")
    @classmethod
    def validate_organ(
        cls,
        value: str,
    ):
        cleaned = value.strip()

        if not cleaned:
            raise ValueError(
                "Organ or tissue is required"
            )

        normalized = ORGAN_ALIASES.get(
            cleaned.lower()
        )

        if normalized is None:
            raise ValueError(
                f"Invalid organ or tissue: {cleaned}"
            )

        return normalized

    # =====================================================
    # DATE VALIDATION
    # =====================================================

    @field_validator("required_date")
    @classmethod
    def validate_required_date(
        cls,
        value: date,
    ):
        if value < date.today():
            raise ValueError(
                "Required date cannot be in the past"
            )

        return value

    # =====================================================
    # PHONE VALIDATION
    # =====================================================

    @field_validator("contact_phone")
    @classmethod
    def validate_contact_phone(
        cls,
        value: str,
    ):
        cleaned = value.strip()

        if not cleaned.isdigit():
            raise ValueError(
                "Contact phone must contain digits only"
            )

        if not 10 <= len(cleaned) <= 15:
            raise ValueError(
                "Contact phone must contain 10 to 15 digits"
            )

        return cleaned

    # =====================================================
    # BLOOD GROUP VALIDATION
    # =====================================================

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(
        cls,
        value: Optional[str],
    ):
        if value is None:
            return None

        cleaned = value.strip()

        if not cleaned:
            return None

        allowed = {
            "A+",
            "A-",
            "B+",
            "B-",
            "AB+",
            "AB-",
            "O+",
            "O-",
        }

        if cleaned not in allowed:
            raise ValueError(
                "Invalid blood group"
            )

        return cleaned

    # =====================================================
    # REASON VALIDATION
    # OPTIONAL
    # =====================================================

    @field_validator("reason")
    @classmethod
    def validate_reason(
        cls,
        value: Optional[str],
    ):
        if value is None:
            return None

        cleaned = value.strip()

        if not cleaned:
            return None

        return cleaned


# =========================================================
# PUBLIC RESPONSE
# =========================================================


class OrganRequirementPublic(BaseModel):

    id: str

    organ_required: str

    donation_type: OrganRequirementDonationType

    blood_group: Optional[str] = None

    units_required: int

    original_units_required: int

    units_fulfilled: int

    remaining_units: int

    hospital_name: str

    hospital_city: str

    hospital_state: str

    required_date: date

    urgency: OrganRequirementUrgency

    status: OrganRequirementStatus

    created_at: datetime


# =========================================================
# FULL RESPONSE
# =========================================================


class OrganRequirementResponse(
    OrganRequirementPublic
):

    reason: Optional[str] = None

    contact_name: str

    contact_phone: str

    updated_at: datetime

    donor_responses: list[dict] = Field(
        default_factory=list
    )


# =========================================================
# ORGAN DONATION RESPONSE
# =========================================================


class OrganRequirementResponseCreate(
    BaseModel
):

    requirement_id: str

    organ_donation_id: str