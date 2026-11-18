from rapidfuzz import fuzz


def normalize_medicine_name(
    name: str,
) -> str:

    if not name:
        return ""

    return (
        name
        .lower()
        .strip()
        .replace(".", "")
        .replace(",", "")
        .replace("-", " ")
    )


def calculate_match_score(
    first: str,
    second: str,
) -> float:

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


    if not first_normalized:
        return 0.0


    if not second_normalized:
        return 0.0


    score = fuzz.WRatio(
        first_normalized,
        second_normalized,
    )


    return round(
        score / 100,
        2,
    )


def find_best_medicine_match(
    candidate: str,
    medicines: list[dict],
):

    if not candidate:
        return None


    best_match = None
    best_score = 0.0


    for medicine in medicines:

        possible_names = [
            medicine.get(
                "name",
                "",
            )
        ]


        possible_names.extend(
            medicine.get(
                "brand_names",
                [],
            )
        )


        for name in possible_names:

            score = (
                calculate_match_score(
                    candidate,
                    name,
                )
            )


            if score > best_score:

                best_score = score

                best_match = medicine


    if not best_match:
        return None


    return {
        "medicine": best_match,
        "confidence": best_score,
    }