
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field


class MedicineCatalogueDocument(BaseModel):
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
    )

    id: ObjectId = Field(default_factory=ObjectId, alias="_id")
    name: str
    brand_name: str | None = None
    generic_name: str | None = None
    strength: str | None = None
    dosage_form: str | None = None
    category: str | None = None

    image_url: str | None = None
    description: str | None = None

    uses: list[str] = Field(default_factory=list)
    age_restrictions: dict[str, Any] = Field(default_factory=dict)
    dosage_information: dict[str, Any] = Field(default_factory=dict)

    warnings: list[str] = Field(default_factory=list)
    side_effects: list[str] = Field(default_factory=list)
    contraindications: list[str] = Field(default_factory=list)

    storage: str | None = None
    buying_links: list[dict[str, str]] = Field(default_factory=list)

    information_source: str | None = None
    verified: bool = False
    last_verified: datetime | None = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
