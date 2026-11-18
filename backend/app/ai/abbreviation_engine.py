"""
MedVisionRx - Prescription Abbreviation Engine

Expands common prescription abbreviations into readable text.

This module is intentionally conservative.
It does not attempt to guess unknown abbreviations.
"""

import re


# =========================================================
# PRESCRIPTION ABBREVIATIONS
# =========================================================

ABBREVIATIONS = {
    # Frequency
    "OD": "Once Daily",
    "BD": "Twice Daily",
    "BID": "Twice Daily",
    "TDS": "Three Times Daily",
    "TID": "Three Times Daily",
    "QID": "Four Times Daily",

    # Timing
    "HS": "At Bedtime",
    "QHS": "At Bedtime",
    "AC": "Before Meals",
    "PC": "After Meals",
    "BBF": "Before Breakfast",
    "ABF": "After Breakfast",
    "BBL": "Before Lunch",
    "ABL": "After Lunch",
    "BBD": "Before Dinner",
    "ABD": "After Dinner",

    # As needed
    "SOS": "As Needed",
    "PRN": "As Needed",

    # Routes
    "PO": "By Mouth",
    "ORAL": "By Mouth",
    "IV": "Intravenous",
    "IM": "Intramuscular",
    "SC": "Subcutaneous",
    "SQ": "Subcutaneous",
    "SL": "Sublingual",
    "TOP": "Topical",

    # Common prescription instructions
    "STAT": "Immediately",
    "NOW": "Immediately",
    "CONT": "Continue",
    "STOP": "Stop",
    "DISCONTINUE": "Stop",
}


# =========================================================
# NORMALIZATION
# =========================================================

def normalize_abbreviation_token(token: str) -> str:
    """
    Normalize a single token before abbreviation lookup.
    """

    if not token:
        return ""

    token = token.strip()

    # Remove common punctuation around abbreviation.
    token = re.sub(
        r"^[^\w]+|[^\w]+$",
        "",
        token,
    )

    return token.upper()


# =========================================================
# SINGLE ABBREVIATION
# =========================================================

def expand_abbreviation(abbreviation: str) -> str:
    """
    Expand one abbreviation.

    Unknown abbreviations are returned unchanged.
    """

    if not abbreviation:
        return ""

    normalized = normalize_abbreviation_token(
        abbreviation
    )

    return ABBREVIATIONS.get(
        normalized,
        abbreviation,
    )


# =========================================================
# FULL TEXT EXPANSION
# =========================================================

def expand_abbreviations(text: str) -> str:
    """
    Expand recognized prescription abbreviations
    inside a complete OCR text string.
    """

    if not text:
        return ""

    words = text.split()

    expanded_words = []

    for word in words:

        normalized = normalize_abbreviation_token(
            word
        )

        if normalized in ABBREVIATIONS:

            replacement = ABBREVIATIONS[
                normalized
            ]

            # Preserve punctuation when possible.
            leading = re.match(
                r"^[^\w]*",
                word,
            )

            trailing = re.search(
                r"[^\w]*$",
                word,
            )

            prefix = (
                leading.group(0)
                if leading
                else ""
            )

            suffix = (
                trailing.group(0)
                if trailing
                else ""
            )

            expanded_words.append(
                f"{prefix}{replacement}{suffix}"
            )

        else:
            expanded_words.append(word)

    return " ".join(expanded_words)


# =========================================================
# PRESCRIPTION INTERPRETATION HELPER
# =========================================================

def interpret_prescription_text(
    text: str,
) -> str:
    """
    Convenience wrapper used by prescription
    interpretation code.
    """

    return expand_abbreviations(text)


# =========================================================
# EXPORTS
# =========================================================

__all__ = [
    "ABBREVIATIONS",
    "expand_abbreviation",
    "expand_abbreviations",
    "interpret_prescription_text",
]