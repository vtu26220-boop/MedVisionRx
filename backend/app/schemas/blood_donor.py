from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ============================================================
# BLOOD DONOR REGISTRATION
# ============================================================


class BloodDonorCreate(BaseModel):

    # --------------------------------------------------------
    # USER ID
    # --------------------------------------------------------
    # Temporary optional until authentication is implemented.
    # Once Login/Auth is completed, this will identify exactly
    # which user owns this blood donor profile.
    # --------------------------------------------------------

    user_id: Optional[str] = Field(
        default=None,
        min_length=1,
        description=(
            "Authenticated user ID who owns this blood donor profile"
        ),
    )

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    date_of_birth: date

    gender: str
    phone: str
    email: EmailStr

    address: str
    city: str
    state: str
    pincode: str

    blood_group: str

    weight_kg: float = Field(
        ...,
        gt=0,
    )

    last_donation_date: Optional[date] = None

    previous_donations: int = Field(
        default=0,
        ge=0,
    )

    medical_conditions: List[str] = Field(
        default_factory=list,
    )

    medications: List[str] = Field(
        default_factory=list,
    )

    recent_travel: Optional[str] = None

    recent_tattoo: Optional[str] = None

    availability: bool = True

    consent: bool = Field(
        ...,
        description=(
            "Donor confirms consent to register "
            "as a blood donor"
        ),
    )

    emergency_contact_name: Optional[str] = None

    emergency_contact_phone: Optional[str] = None


# ============================================================
# BLOOD DONOR RESPONSE
# ============================================================


class BloodDonorResponse(BloodDonorCreate):

    id: str

    verification_status: str

    created_at: str

    updated_at: str


# ============================================================
# ACTUAL BLOOD DONATION RECORD
# ============================================================


class BloodDonationCreate(BaseModel):
    """
    Represents an actual blood donation response to a
    specific blood requirement.

    Registering as a donor does NOT create a donation record.

    A donation record is created only when the donor explicitly
    confirms that they want to donate for a specific active
    blood requirement.
    """

    # --------------------------------------------------------
    # DONOR
    # --------------------------------------------------------

    donor_id: str = Field(
        ...,
        min_length=1,
        description="MongoDB ID of the blood donor",
    )

    # --------------------------------------------------------
    # BLOOD REQUIREMENT
    # --------------------------------------------------------

    blood_requirement_id: str = Field(
        ...,
        min_length=1,
        description=(
            "MongoDB ID of the exact blood requirement "
            "accepted by the donor"
        ),
    )

    # --------------------------------------------------------
    # DONATION INFORMATION
    # --------------------------------------------------------

    donation_date: date = Field(
        ...,
        description="Date on which the donor accepts the donation request",
    )

    @field_validator("donation_date", mode="before")
    @classmethod
    def normalize_donation_date(cls, value):
        """
        Accept both:
        - YYYY-MM-DD
        - ISO datetime strings such as
          YYYY-MM-DDTHH:MM:SS.sssZ

        Store the value internally as a Python date.
        """

        if isinstance(value, datetime):
            return value.date()

        if isinstance(value, date):
            return value

        if isinstance(value, str):
            value = value.strip()

            # Normal date:
            # 2026-09-27
            try:
                return date.fromisoformat(value)
            except ValueError:
                pass

            # ISO datetime:
            # 2026-09-27T06:42:31.123Z
            try:
                normalized = value.replace(
                    "Z",
                    "+00:00",
                )

                return datetime.fromisoformat(
                    normalized
                ).date()

            except ValueError:
                pass

        raise ValueError(
            "donation_date must be a valid date or ISO datetime"
        )

    # --------------------------------------------------------
    # BLOOD GROUP
    # --------------------------------------------------------

    blood_group: str = Field(
        ...,
        min_length=2,
        max_length=5,
    )

    # --------------------------------------------------------
    # UNITS
    # --------------------------------------------------------

    units: int = Field(
        default=1,
        ge=1,
        le=2,
    )

    # --------------------------------------------------------
    # OPTIONAL INFORMATION
    # --------------------------------------------------------

    certificate: Optional[str] = None

    notes: Optional[str] = None


# ============================================================
# BLOOD DONATION RESPONSE
# ============================================================


class BloodDonationResponse(BloodDonationCreate):

    id: str

    # Hospital is obtained from the selected blood requirement.
    hospital_name: Optional[str] = None

    # Request information returned after donation.
    request_hospital_name: Optional[str] = None
    request_hospital_city: Optional[str] = None
    request_hospital_state: Optional[str] = None
    request_required_date: Optional[date] = None
    request_urgency: Optional[str] = None

    # Requester information.
    requester_name: Optional[str] = None
    requester_phone: Optional[str] = None

    # Request progress.
    request_status: Optional[str] = None
    units_fulfilled: Optional[int] = None
    remaining_units: Optional[int] = None

    created_at: str