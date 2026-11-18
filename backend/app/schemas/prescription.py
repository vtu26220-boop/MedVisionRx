from typing import List, Optional
from pydantic import BaseModel, Field


class PharmacyOption(BaseModel):
    name: str
    url: str
    price: Optional[str] = None
    availability: Optional[str] = None


class MedicineAnalysis(BaseModel):
    medicine_name: str
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    route: Optional[str] = None

    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None

    confidence: float = 0.0
    confidence_label: str = "Low"

    uses: List[str] = Field(default_factory=list)
    side_effects: List[str] = Field(default_factory=list)
    precautions: List[str] = Field(default_factory=list)

    pharmacy_options: List[PharmacyOption] = Field(default_factory=list)


class PrescriptionResponse(BaseModel):
    id: str

    status: str

    filename: Optional[str] = None

    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    prescription_date: Optional[str] = None

    raw_text: str = ""

    medicines: List[MedicineAnalysis] = Field(default_factory=list)

    interactions: List[str] = Field(default_factory=list)

    warnings: List[str] = Field(default_factory=list)

    report_url: Optional[str] = None

    created_at: str