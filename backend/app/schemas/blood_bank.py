from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl, field_validator


class BloodBankCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)

    organization: Optional[str] = Field(
        default=None,
        max_length=150,
    )

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

    pincode: Optional[str] = Field(
        default=None,
        max_length=10,
    )

    phone: str = Field(
        ...,
        min_length=10,
        max_length=15,
    )

    whatsapp_number: Optional[str] = Field(
        default=None,
        max_length=15,
    )

    email: Optional[str] = Field(
        default=None,
        max_length=150,
    )

    website_url: Optional[HttpUrl] = None

    opening_hours: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    available_blood_groups: List[str] = Field(
        default_factory=list,
    )

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    is_active: bool = True

    @field_validator("phone", "whatsapp_number")
    @classmethod
    def validate_phone(cls, value):
        if value is None:
            return value

        cleaned = (
            value.replace("+", "")
            .replace(" ", "")
            .replace("-", "")
        )

        if not cleaned.isdigit():
            raise ValueError(
                "Phone number must contain valid digits"
            )

        return value


class BloodBankResponse(BloodBankCreate):
    id: str
    created_at: datetime
    updated_at: datetime