import re
from rapidfuzz import process, fuzz


MEDICINE_DATABASE = [
    {
        "name": "Paracetamol",
        "generic_name": "Paracetamol",
        "brand_names": [
            "Dolo",
            "Dolo 650",
            "Crocin",
        ],
        "uses": [
            "Pain relief",
            "Fever reduction",
        ],
        "side_effects": [
            "Nausea",
            "Stomach discomfort",
        ],
        "precautions": [
            "Use cautiously in people with liver disease.",
        ],
    },
    {
        "name": "Metformin",
        "generic_name": "Metformin",
        "brand_names": [
            "Glucophage",
        ],
        "uses": [
            "Type 2 diabetes management",
        ],
        "side_effects": [
            "Nausea",
            "Diarrhea",
            "Stomach discomfort",
        ],
        "precautions": [
            "Discuss kidney problems with a healthcare professional.",
        ],
    },
    {
        "name": "Amlodipine",
        "generic_name": "Amlodipine",
        "brand_names": [
            "Norvasc",
        ],
        "uses": [
            "High blood pressure",
            "Certain types of chest pain",
        ],
        "side_effects": [
            "Swelling",
            "Dizziness",
            "Headache",
        ],
        "precautions": [
            "Discuss liver or heart conditions with a healthcare professional.",
        ],
    },
    {
        "name": "Atorvastatin",
        "generic_name": "Atorvastatin",
        "brand_names": [
            "Lipitor",
        ],
        "uses": [
            "Cholesterol management",
        ],
        "side_effects": [
            "Muscle pain",
            "Digestive discomfort",
        ],
        "precautions": [
            "Discuss liver disease and other medicines with a healthcare professional.",
        ],
    },
    {
        "name": "Amoxicillin",
        "generic_name": "Amoxicillin",
        "brand_names": [
            "Amoxil",
        ],
        "uses": [
            "Treatment of certain bacterial infections",
        ],
        "side_effects": [
            "Nausea",
            "Diarrhea",
            "Rash",
        ],
        "precautions": [
            "People with penicillin allergy should seek professional advice.",
        ],
    },
]


def normalize_name(value: str) -> str:
    value = value.lower().strip()

    value = re.sub(
        r"[^a-z0-9\s]",
        " ",
        value,
    )

    value = re.sub(
        r"\s+",
        " ",
        value,
    )

    return value


def match_medicine(
    candidate: str,
):
    if not candidate:
        return None

    normalized = normalize_name(candidate)

    choices = {}

    for item in MEDICINE_DATABASE:
        choices[
            normalize_name(item["name"])
        ] = item

        for brand in item["brand_names"]:
            choices[
                normalize_name(brand)
            ] = item

    match = process.extractOne(
        normalized,
        choices.keys(),
        scorer=fuzz.WRatio,
    )

    if not match:
        return None

    matched_name, score, _ = match

    # Conservative threshold.
    if score < 82:
        return {
            "matched": False,
            "candidate": candidate,
            "confidence": round(score / 100, 2),
        }

    medicine = choices[matched_name]

    confidence = round(
        min(score / 100, 0.99),
        2,
    )

    return {
        "matched": True,
        "confidence": confidence,
        "medicine": medicine,
    }