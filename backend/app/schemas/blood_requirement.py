
from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class BloodGroup(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


class BloodUrgency(str, Enum):
    NORMAL = "normal"
    URGENT = "urgent"
    EMERGENCY = "emergency"


class BloodRequirementStatus(str, Enum):
    ACTIVE = "active"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


# Information submitted when creating a blood request.
class BloodRequirementCreate(BaseModel):
    blood_group: BloodGroup

    units_required: int = Field(
        ...,
        ge=1,
        le=20
    )

    hospital_name: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    hospital_city: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    hospital_state: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    required_date: date

    urgency: BloodUrgency

    reason: Optional[str] = Field(
        default=None,
        max_length=500
    )

    contact_name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    contact_phone: str = Field(
        ...,
        min_length=10,
        max_length=15
    )

    @field_validator("required_date")
    @classmethod
    def validate_required_date(cls, value: date):
        if value < date.today():
            raise ValueError(
                "Required date cannot be in the past"
            )
        return value

    @field_validator("contact_phone")
    @classmethod
    def validate_contact_phone(cls, value: str):
        if not value.isdigit():
            raise ValueError(
                "Contact phone must contain digits only"
            )
        return value


# Public information visible to blood donors.
# Private contact details are intentionally excluded.
class BloodRequirementPublic(BaseModel):
    id: str
    blood_group: BloodGroup
    units_required: int
    hospital_name: str
    hospital_city: str
    hospital_state: str
    required_date: date
    urgency: BloodUrgency
    status: BloodRequirementStatus
    created_at: datetime


# Complete record for authorized access.
class BloodRequirementResponse(BloodRequirementPublic):
    reason: Optional[str] = None
    contact_name: str
    contact_phone: str
    updated_at: datetime