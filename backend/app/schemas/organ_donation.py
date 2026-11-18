from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# =========================================================
# ENUMS
# =========================================================


class DonationType(str, Enum):
    DECEASED = "deceased"
    LIVING = "living"


class OrganDonationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CANCELLED = "cancelled"


class EligibilityStatus(str, Enum):
    ELIGIBLE = "eligible"
    NOT_ELIGIBLE = "not_eligible"
    MEDICAL_REVIEW = "medical_review"


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"
    PREFER_NOT_TO_SAY = "Prefer not to say"


class BloodGroup(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


class EmergencyRelationship(str, Enum):
    PARENT = "Parent"
    SPOUSE = "Spouse"
    SIBLING = "Sibling"
    CHILD = "Child"
    RELATIVE = "Relative"
    FRIEND = "Friend"
    OTHER = "Other"


# =========================================================
# ORGAN OPTIONS
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
# CREATE SCHEMA
# =========================================================


class OrganDonationCreate(BaseModel):
    # -----------------------------------------------------
    # Personal Information
    # -----------------------------------------------------

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    date_of_birth: date

    gender: Gender

    blood_group: BloodGroup

    phone: str = Field(
        ...,
        min_length=10,
        max_length=15,
    )

    email: str = Field(
        ...,
        min_length=5,
        max_length=150,
    )

    # -----------------------------------------------------
    # Address
    # -----------------------------------------------------

    address: str = Field(
        ...,
        min_length=5,
        max_length=300,
    )

    city: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    state: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    pincode: str = Field(
        ...,
        min_length=5,
        max_length=10,
    )

    # -----------------------------------------------------
    # Emergency Contact
    # -----------------------------------------------------

    emergency_name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    emergency_relationship: EmergencyRelationship

    emergency_phone: str = Field(
        ...,
        min_length=10,
        max_length=15,
    )

    # -----------------------------------------------------
    # Donation
    # -----------------------------------------------------

    donation_type: DonationType

    organs: List[str] = Field(
        ...,
        min_length=1,
        max_length=10,
    )

    # -----------------------------------------------------
    # Medical Information
    # -----------------------------------------------------

    has_chronic_disease: bool

    chronic_disease_details: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    has_infectious_disease: bool

    infectious_disease_details: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    currently_taking_medication: bool

    medication_details: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    # -----------------------------------------------------
    # Eligibility
    # -----------------------------------------------------

    eligibility_status: EligibilityStatus

    eligibility_reasons: List[str] = Field(
        default_factory=list,
        max_length=10,
    )

    # -----------------------------------------------------
    # Consent
    # -----------------------------------------------------

    consent: bool

    information_correct: bool

    # -----------------------------------------------------
    # VALIDATORS
    # -----------------------------------------------------

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, value: date):
        if value > date.today():
            raise ValueError(
                "Date of birth cannot be in the future"
            )

        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str):
        cleaned = value.strip()

        if not cleaned.isdigit():
            raise ValueError(
                "Phone number must contain digits only"
            )

        return cleaned

    @field_validator("emergency_phone")
    @classmethod
    def validate_emergency_phone(cls, value: str):
        cleaned = value.strip()

        if not cleaned.isdigit():
            raise ValueError(
                "Emergency phone number must contain digits only"
            )

        return cleaned

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: str):
        cleaned = value.strip()

        if not cleaned.isdigit():
            raise ValueError(
                "Pincode must contain digits only"
            )

        return cleaned

    @field_validator("organs")
    @classmethod
    def validate_organs(cls, value: List[str]):
        if not value:
            raise ValueError(
                "At least one organ or tissue must be selected"
            )

        invalid_organs = [
            organ
            for organ in value
            if organ not in ALLOWED_ORGANS
        ]

        if invalid_organs:
            raise ValueError(
                f"Invalid organ or tissue selection: "
                f"{', '.join(invalid_organs)}"
            )

        # Remove duplicates while preserving order
        unique_organs = list(dict.fromkeys(value))

        return unique_organs

    @field_validator("chronic_disease_details")
    @classmethod
    def validate_chronic_disease_details(
        cls,
        value: Optional[str],
    ):
        if value is not None:
            return value.strip() or None

        return value

    @field_validator("infectious_disease_details")
    @classmethod
    def validate_infectious_disease_details(
        cls,
        value: Optional[str],
    ):
        if value is not None:
            return value.strip() or None

        return value

    @field_validator("medication_details")
    @classmethod
    def validate_medication_details(
        cls,
        value: Optional[str],
    ):
        if value is not None:
            return value.strip() or None

        return value


# =========================================================
# PUBLIC RESPONSE
# =========================================================


class OrganDonationPublic(BaseModel):
    id: str

    full_name: str
    city: str
    state: str

    donation_type: DonationType

    organs: List[str]

    eligibility_status: EligibilityStatus

    status: OrganDonationStatus

    created_at: datetime


# =========================================================
# FULL RESPONSE
# =========================================================


class OrganDonationResponse(OrganDonationPublic):
    date_of_birth: date

    gender: Gender

    blood_group: BloodGroup

    phone: str
    email: str

    address: str
    pincode: str

    emergency_name: str
    emergency_relationship: EmergencyRelationship
    emergency_phone: str

    has_chronic_disease: bool
    chronic_disease_details: Optional[str] = None

    has_infectious_disease: bool
    infectious_disease_details: Optional[str] = None

    currently_taking_medication: bool
    medication_details: Optional[str] = None

    eligibility_reasons: List[str]

    consent: bool
    information_correct: bool

    updated_at: datetime