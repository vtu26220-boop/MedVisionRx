from itertools import combinations


# =========================================================
# DRUG INTERACTION DATABASE
# =========================================================
#
# Initial verified-rule layer.
#
# IMPORTANT:
# This is a safety-warning layer, not a substitute for
# a pharmacist/doctor or a complete drug-interaction
# database.
# =========================================================

INTERACTION_DATABASE = [
    {
        "medicines": {
            "ibuprofen",
            "aspirin",
        },
        "severity": "moderate",
        "title": "Potential bleeding risk",
        "message": (
            "Using these medicines together may "
            "increase the risk of bleeding."
        ),
        "action": (
            "Verify the combination with a doctor "
            "or pharmacist before taking them together."
        ),
    },

    {
        "medicines": {
            "ibuprofen",
            "warfarin",
        },
        "severity": "high",
        "title": "Potential bleeding risk",
        "message": (
            "This combination may increase "
            "bleeding risk."
        ),
        "action": (
            "Seek professional medical advice "
            "before using these medicines together."
        ),
    },

    {
        "medicines": {
            "aspirin",
            "warfarin",
        },
        "severity": "high",
        "title": "Potential bleeding risk",
        "message": (
            "This combination can increase "
            "bleeding risk."
        ),
        "action": (
            "Confirm the combination with "
            "your healthcare professional."
        ),
    },
]


# =========================================================
# NORMALIZE MEDICINE NAME
# =========================================================

def normalize_medicine_name(
    name: str,
) -> str:

    if not name:
        return ""

    return (
        name
        .strip()
        .lower()
    )


# =========================================================
# CHECK TWO MEDICINES
# =========================================================

def check_pair(
    first: str,
    second: str,
):
    first_normalized = (
        normalize_medicine_name(
            first
        )
    )

    second_normalized = (
        normalize_medicine_name(
            second
        )
    )


    pair = {
        first_normalized,
        second_normalized,
    }


    for interaction in (
        INTERACTION_DATABASE
    ):

        if (
            interaction["medicines"]
            == pair
        ):

            return {
                "medicine_1": first,
                "medicine_2": second,
                "severity": interaction[
                    "severity"
                ],
                "title": interaction[
                    "title"
                ],
                "message": interaction[
                    "message"
                ],
                "action": interaction[
                    "action"
                ],
            }


    return None


# =========================================================
# CHECK ALL MEDICINES
# =========================================================

def check_interactions(
    medicines: list[dict],
) -> list[dict]:

    if not medicines:
        return []


    names = []


    for medicine in medicines:

        name = (
            medicine.get(
                "generic_name"
            )
            or medicine.get(
                "medicine_name"
            )
        )


        if name:
            names.append(name)


    interactions = []


    for first, second in combinations(
        names,
        2,
    ):

        result = check_pair(
            first,
            second,
        )


        if result:
            interactions.append(
                result
            )


    return interactions