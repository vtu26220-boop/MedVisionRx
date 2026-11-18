from typing import Any


# =========================================================
# MEDICINE RECOMMENDATION SERVICE
# =========================================================
#
# This service does NOT replace the doctor's prescription.
#
# Its purpose is to provide informational generic-name
# information when the medicine has been confidently
# identified.
#
# We do NOT automatically substitute a prescribed medicine.
# =========================================================


def build_medicine_recommendation(
    medicine: dict[str, Any],
) -> dict[str, Any]:

    medicine_name = medicine.get(
        "medicine_name"
    )

    generic_name = medicine.get(
        "generic_name"
    )

    confidence = medicine.get(
        "confidence",
        0.0,
    )

    needs_verification = medicine.get(
        "needs_verification",
        False,
    )


    # -----------------------------------------------------
    # UNKNOWN / UNCERTAIN MEDICINE
    # -----------------------------------------------------

    if (
        not generic_name
        or needs_verification
        or confidence < 0.80
    ):

        return {
            "medicine_name": medicine_name,

            "generic_name": None,

            "recommendation_available": False,

            "message": (
                "A generic medicine recommendation "
                "cannot be provided because the "
                "prescription medicine was not "
                "identified with sufficient confidence."
            ),

            "needs_verification": True,
        }


    # -----------------------------------------------------
    # CONFIRMED MEDICINE
    # -----------------------------------------------------

    return {
        "medicine_name": medicine_name,

        "generic_name": generic_name,

        "recommendation_available": True,

        "message": (
            "The generic name shown here is "
            "informational. Do not substitute a "
            "prescribed medicine without confirmation "
            "from a doctor or pharmacist."
        ),

        "needs_verification": False,
    }


# =========================================================
# BUILD RECOMMENDATIONS FOR ALL MEDICINES
# =========================================================

def build_recommendations(
    medicines: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    recommendations = []


    for medicine in medicines:

        recommendation = (
            build_medicine_recommendation(
                medicine
            )
        )

        recommendations.append(
            recommendation
        )


    return recommendations