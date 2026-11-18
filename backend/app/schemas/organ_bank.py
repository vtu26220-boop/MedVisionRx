from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# ============================================================
# CONTACT NUMBER VALIDATION
# ============================================================

def validate_contact_number(
    value: Optional[str],
) -> Optional[str]:

    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return None

    digit_count = sum(
        character.isdigit()
        for character in value
    )

    if digit_count < 7:
        raise ValueError(
            "Contact number must contain at least 7 digits."
        )

    return value


# ============================================================
# ORGAN BANK CREATE
# ============================================================

class OrganBankCreate(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=200,
    )

    organization: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    type: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    address: str = Field(
        ...,
        min_length=5,
        max_length=500,
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
        max_length=20,
    )

    # IMPORTANT:
    # Some genuine facilities do not have a
    # publicly listed phone number.
    phone: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    whatsapp_number: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    email: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    website_url: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    opening_hours: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    services: List[str] = Field(
        default_factory=list,
    )

    latitude: Optional[float] = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: Optional[float] = Field(
        default=None,
        ge=-180,
        le=180,
    )

    is_active: bool = True

    # ========================================================
    # REQUIRED TEXT
    # ========================================================

    @field_validator(
        "name",
        "type",
        "address",
        "city",
        "state",
    )
    @classmethod
    def validate_required_text(
        cls,
        value: str,
    ) -> str:

        value = value.strip()

        if not value:
            raise ValueError(
                "This field cannot be empty."
            )

        return value

    # ========================================================
    # PHONE
    # ========================================================

    @field_validator(
        "phone",
        "whatsapp_number",
        mode="before",
    )
    @classmethod
    def validate_phone(
        cls,
        value,
    ):

        return validate_contact_number(value)

    # ========================================================
    # OPTIONAL TEXT
    # ========================================================

    @field_validator(
        "organization",
        "pincode",
        "email",
        "website_url",
        "opening_hours",
    )
    @classmethod
    def clean_optional_text(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = str(value).strip()

        return value or None

    # ========================================================
    # EMAIL
    # ========================================================

    @field_validator("email")
    @classmethod
    def validate_email(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        if (
            "@" not in value
            or "." not in value.split("@")[-1]
        ):
            raise ValueError(
                "Enter a valid email address."
            )

        return value.lower()

    # ========================================================
    # SERVICES
    # ========================================================

    @field_validator("services")
    @classmethod
    def validate_services(
        cls,
        value: List[str],
    ) -> List[str]:

        cleaned = []

        for service in value:

            service = str(
                service
            ).strip()

            if (
                service
                and service not in cleaned
            ):
                cleaned.append(service)

        return cleaned


# ============================================================
# ORGAN BANK UPDATE
# ============================================================

class OrganBankUpdate(BaseModel):

    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=200,
    )

    organization: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    address: Optional[str] = Field(
        default=None,
        min_length=5,
        max_length=500,
    )

    city: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    state: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    pincode: Optional[str] = Field(
        default=None,
        max_length=20,
    )

    phone: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    whatsapp_number: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    email: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    website_url: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    opening_hours: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    services: Optional[List[str]] = None

    latitude: Optional[float] = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: Optional[float] = Field(
        default=None,
        ge=-180,
        le=180,
    )

    is_active: Optional[bool] = None

    @field_validator(
        "phone",
        "whatsapp_number",
        mode="before",
    )
    @classmethod
    def validate_update_phone(
        cls,
        value,
    ):

        return validate_contact_number(value)


# ============================================================
# STATUS
# ============================================================

class OrganBankStatusUpdate(BaseModel):

    is_active: bool


# ============================================================
# RESPONSE
# ============================================================

class OrganBankResponse(BaseModel):

    id: str

    name: str

    organization: Optional[str] = None

    type: str

    address: str

    city: str

    state: str

    pincode: Optional[str] = None

    phone: Optional[str] = None

    whatsapp_number: Optional[str] = None

    email: Optional[str] = None

    website_url: Optional[str] = None

    opening_hours: Optional[str] = None

    services: List[str] = Field(
        default_factory=list,
    )

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    is_active: bool

    created_at: datetime

    updated_at: datetime


# ============================================================
# BULK RESPONSE
# ============================================================

class OrganBankBulkResponse(BaseModel):

    inserted_count: int

    message: str

    records: List[OrganBankResponse] = Field(
        default_factory=list,
    )