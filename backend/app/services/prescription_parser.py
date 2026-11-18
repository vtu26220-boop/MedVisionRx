import re
from typing import Any

from app.ai.abbreviation_engine import (
    expand_abbreviations,
)

from app.services.medicine_matcher import (
    find_best_medicine_match,
)

from app.services.medicine_service import (
    get_medicine_catalog,
)


# =========================================================
# MEDICINE / PRESCRIPTION PARSER
# =========================================================

MEDICINE_PREFIXES = (
    "tab",
    "tablet",
    "cap",
    "capsule",
    "syrup",
    "syp",
    "inj",
    "injection",
    "cream",
    "ointment",
    "drops",
    "drop",
    "gel",
    "powder",
    "sachet",
)


DOSAGE_PATTERNS = [
    r"\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu)\b",
]


FREQUENCY_MAP = {
    "OD": "Once daily",
    "BD": "Twice daily",
    "BID": "Twice daily",
    "TDS": "Three times daily",
    "TID": "Three times daily",
    "QID": "Four times daily",
    "HS": "At bedtime",
    "SOS": "As needed",
    "PRN": "As needed",
    "QHS": "At bedtime",
}


# =========================================================
# NORMALIZE OCR TEXT
# =========================================================

def normalize_ocr_text(
    text: str,
) -> str:

    if not text:
        return ""


    # Common OCR substitutions.
    replacements = {
        "|": "I",
        "—": "-",
        "–": "-",
        "×": "x",
    }


    normalized = text


    for old, new in replacements.items():

        normalized = normalized.replace(
            old,
            new,
        )


    normalized = re.sub(
        r"[ \t]+",
        " ",
        normalized,
    )


    normalized = re.sub(
        r"\n{3,}",
        "\n\n",
        normalized,
    )


    return normalized.strip()


# =========================================================
# EXPAND PRESCRIPTION ABBREVIATIONS
# =========================================================

def interpret_text(
    text: str,
) -> str:

    if not text:
        return ""


    expanded = (
        expand_abbreviations(
            text
        )
    )


    # Also handle uppercase frequency
    # abbreviations that may not be covered
    # by the existing abbreviation engine.

    for abbreviation, meaning in (
        FREQUENCY_MAP.items()
    ):

        expanded = re.sub(
            rf"\b{re.escape(abbreviation)}\b",
            meaning,
            expanded,
            flags=re.IGNORECASE,
        )


    return expanded


# =========================================================
# EXTRACT STRENGTH
# =========================================================

def extract_strength(
    text: str,
) -> str | None:

    if not text:
        return None


    for pattern in DOSAGE_PATTERNS:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )


        if match:

            return (
                f"{match.group(1)} "
                f"{match.group(2)}"
            )


    return None


# =========================================================
# EXTRACT FREQUENCY
# =========================================================

def extract_frequency(
    text: str,
) -> str | None:

    if not text:
        return None


    upper_text = text.upper()


    # First check explicit abbreviations.
    for abbreviation, meaning in (
        FREQUENCY_MAP.items()
    ):

        if re.search(
            rf"\b{re.escape(abbreviation)}\b",
            upper_text,
        ):

            return meaning


    # Numeric prescription notation.
    #
    # 1-0-1
    # 1-1-1
    # 0-0-1
    # 1-0-0
    #

    numeric = re.search(
        r"\b([01])[-/]([01])[-/]([01])\b",
        text,
    )


    if numeric:

        morning = int(
            numeric.group(1)
        )

        afternoon = int(
            numeric.group(2)
        )

        night = int(
            numeric.group(3)
        )


        total = (
            morning
            + afternoon
            + night
        )


        if total == 1:

            if night:
                return "Once daily (night)"

            if afternoon:
                return "Once daily (afternoon)"

            return "Once daily (morning)"


        if total == 2:
            return "Twice daily"


        if total == 3:
            return "Three times daily"


        if total == 4:
            return "Four times daily"


        return (
            f"{total} times daily"
        )


    # Natural-language frequency.
    natural_patterns = [
        (
            r"\bonce\s+(?:a|per)\s+day\b",
            "Once daily",
        ),
        (
            r"\btwice\s+(?:a|per)\s+day\b",
            "Twice daily",
        ),
        (
            r"\bthree\s+times\s+(?:a|per)\s+day\b",
            "Three times daily",
        ),
        (
            r"\bfour\s+times\s+(?:a|per)\s+day\b",
            "Four times daily",
        ),
    ]


    for pattern, result in natural_patterns:

        if re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        ):

            return result


    return None


# =========================================================
# EXTRACT DURATION
# =========================================================

def extract_duration(
    text: str,
) -> str | None:

    if not text:
        return None


    patterns = [
        r"\bfor\s+(\d+)\s*(day|days|week|weeks|month|months)\b",

        r"\bx\s*(\d+)\s*(day|days|week|weeks|month|months)\b",

        r"\b(\d+)\s*(day|days|week|weeks|month|months)\b",
    ]


    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )


        if match:

            number = match.group(1)
            unit = match.group(2)


            return (
                f"{number} "
                f"{unit}"
            )


    return None


# =========================================================
# EXTRACT DOSAGE FORM
# =========================================================

def extract_dosage_form(
    text: str,
) -> str | None:

    if not text:
        return None


    form_map = {
        "tablet": "Tablet",
        "tab": "Tablet",
        "capsule": "Capsule",
        "cap": "Capsule",
        "syrup": "Syrup",
        "syp": "Syrup",
        "injection": "Injection",
        "inj": "Injection",
        "cream": "Cream",
        "ointment": "Ointment",
        "drops": "Drops",
        "drop": "Drops",
        "gel": "Gel",
        "powder": "Powder",
        "sachet": "Sachet",
    }


    lower_text = text.lower()


    for keyword, form in (
        form_map.items()
    ):

        if re.search(
            rf"\b{re.escape(keyword)}\b",
            lower_text,
        ):

            return form


    return None


# =========================================================
# FIND MEDICINE CANDIDATE
# =========================================================

def extract_medicine_candidate(
    line: str,
) -> str | None:

    if not line:
        return None


    cleaned = line.strip()


    # Remove numbering.
    cleaned = re.sub(
        r"^\s*\d+[\.\):-]\s*",
        "",
        cleaned,
    )


    # Remove common prescription prefixes.
    cleaned = re.sub(
        r"^\s*(?:"
        r"Tab(?:let)?|"
        r"Cap(?:sule)?|"
        r"Syp(?:rup)?|"
        r"Inj(?:ection)?|"
        r"Cream|"
        r"Ointment|"
        r"Drops?|"
        r"Gel|"
        r"Powder|"
        r"Sachet"
        r")\s+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )


    # Remove strength.
    cleaned = re.sub(
        r"\b\d+(?:\.\d+)?\s*"
        r"(?:mg|mcg|g|ml|iu)\b",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )


    # Remove dosage instructions.
    cleaned = re.sub(
        r"\b(?:"
        r"OD|BD|BID|TDS|TID|QID|HS|SOS|PRN"
        r")\b",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )


    cleaned = re.sub(
        r"\b[01][-\/][01][-\/][01]\b",
        "",
        cleaned,
    )


    cleaned = re.sub(
        r"\bfor\s+\d+\s*"
        r"(?:day|days|week|weeks|month|months)\b",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )


    cleaned = re.sub(
        r"\s+",
        " ",
        cleaned,
    ).strip()


    if not cleaned:
        return None


    # Ignore obvious non-medicine lines.
    ignored = {
        "prescription",
        "rx",
        "patient",
        "doctor",
        "date",
        "diagnosis",
        "advice",
        "signature",
    }


    if cleaned.lower() in ignored:
        return None


    return cleaned


# =========================================================
# PARSE ONE MEDICINE LINE
# =========================================================

def parse_medicine_line(
    line: str,
    catalog: list[dict[str, Any]],
) -> dict[str, Any] | None:

    candidate = (
        extract_medicine_candidate(
            line
        )
    )


    if not candidate:
        return None


    # -----------------------------------------------------
    # Match against medicine catalog.
    # -----------------------------------------------------

    match = (
        find_best_medicine_match(
            candidate,
            catalog,
        )
    )


    if match:

        confidence = (
            match.get(
                "confidence",
                0.0,
            )
        )

        medicine = match.get(
            "medicine"
        )


        # Do not silently turn a weak OCR match
        # into a confirmed medicine.
        if confidence >= 0.80 and medicine:

            medicine_name = medicine.get(
                "brand_name"
            ) or medicine.get(
                "name"
            ) or candidate


            return {
                "medicine_name": medicine_name,

                "generic_name": medicine.get(
                    "generic_name"
                ),

                "strength": (
                    extract_strength(line)
                    or medicine.get(
                        "default_strength"
                    )
                ),

                "dosage": "Not clearly detected",

                "dosage_form": (
                    extract_dosage_form(
                        line
                    )
                    or medicine.get(
                        "dosage_form"
                    )
                ),

                "frequency": (
                    extract_frequency(line)
                ),

                "duration": (
                    extract_duration(line)
                ),

                "confidence": confidence,

                "source_text": line,

                "needs_verification": False,
            }


    # -----------------------------------------------------
    # Unknown / uncertain medicine.
    # -----------------------------------------------------

    return {
        "medicine_name": candidate,

        "generic_name": None,

        "strength": (
            extract_strength(line)
        ),

        "dosage": "Not clearly detected",

        "dosage_form": (
            extract_dosage_form(
                line
            )
        ),

        "frequency": (
            extract_frequency(line)
        ),

        "duration": (
            extract_duration(line)
        ),

        "confidence": 0.0,

        "source_text": line,

        "needs_verification": True,

        "verification_message": (
            "Medicine name could not be "
            "confirmed confidently. "
            "Please verify it against the "
            "original prescription."
        ),
    }


# =========================================================
# PARSE COMPLETE PRESCRIPTION
# =========================================================

def parse_medicines(
    text: str,
) -> list[dict[str, Any]]:

    normalized = normalize_ocr_text(
        text
    )


    if not normalized:
        return []


    interpreted = interpret_text(
        normalized
    )


    catalog = (
        get_medicine_catalog()
    )


    lines = interpreted.splitlines()


    medicines = []


    for line in lines:

        parsed = parse_medicine_line(
            line,
            catalog,
        )


        if not parsed:
            continue


        # Prevent duplicate medicine entries.
        existing = next(
            (
                item
                for item in medicines
                if (
                    item["medicine_name"]
                    .lower()
                    ==
                    parsed["medicine_name"]
                    .lower()
                )
            ),
            None,
        )


        if existing:

            # Fill missing information
            # from the duplicate line.
            for key, value in parsed.items():

                if (
                    not existing.get(key)
                    and value
                ):

                    existing[key] = value

        else:

            medicines.append(
                parsed
            )


    return medicines