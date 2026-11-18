
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class AgeRestrictions(BaseModel):
    children: Optional[str] = None
    adults: Optional[str] = None
    elderly: Optional[str] = None


class DosageInformation(BaseModel):
    general: Optional[str] = None
    children: Optional[str] = None
    adults: Optional[str] = None
    maximum_dose: Optional[str] = None


class BuyingLink(BaseModel):
    pharmacy: str
    url: HttpUrl


class MedicineCatalogueCreate(BaseModel):
    name: str = Field(..., min_length=1)
    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    category: Optional[str] = None

    image_url: Optional[HttpUrl] = None
    description: Optional[str] = None

    uses: list[str] = Field(default_factory=list)
    age_restrictions: AgeRestrictions = Field(
        default_factory=AgeRestrictions
    )
    dosage_information: DosageInformation = Field(
        default_factory=DosageInformation
    )

    warnings: list[str] = Field(default_factory=list)
    side_effects: list[str] = Field(default_factory=list)
    contraindications: list[str] = Field(default_factory=list)

    storage: Optional[str] = None
    buying_links: list[BuyingLink] = Field(
        default_factory=list
    )

    information_source: Optional[str] = None
    verified: bool = False
    last_verified: Optional[datetime] = None


class MedicineCatalogueResponse(MedicineCatalogueCreate):
    id: str
