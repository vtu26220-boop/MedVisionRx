from functools import lru_cache


# =========================================================
# OCR ENGINE
# =========================================================

@lru_cache(maxsize=1)
def get_ocr_engine():
    """
    Load PaddleOCR only when it is first required.

    Lazy loading prevents the FastAPI server from
    crashing during startup if the OCR engine is
    not yet initialized.
    """

    try:

        from paddleocr import PaddleOCR

    except ImportError as exc:

        raise RuntimeError(
            "PaddleOCR is not installed. "
            "Install PaddleOCR and its supported "
            "runtime before using prescription analysis."
        ) from exc


    # -----------------------------------------------------
    # Try the newer PaddleOCR API first.
    # -----------------------------------------------------

    try:

        return PaddleOCR(
            lang="en",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=True,
        )

    except Exception:

        pass


    # -----------------------------------------------------
    # Fall back to the older API.
    # -----------------------------------------------------

    try:

        return PaddleOCR(
            use_angle_cls=True,
            lang="en",
        )

    except Exception as exc:

        raise RuntimeError(
            f"Unable to initialize PaddleOCR: {exc}"
        ) from exc


# =========================================================
# NEW PADDLEOCR FORMAT
# =========================================================

def _extract_new_format(
    result,
) -> list[str]:

    texts = []


    if not isinstance(
        result,
        list,
    ):

        return texts


    for page in result:

        # PaddleOCR 3.x result object
        if hasattr(
            page,
            "json",
        ):

            try:

                data = page.json

                if callable(data):
                    data = data()


                if isinstance(
                    data,
                    str,
                ):

                    import json

                    data = json.loads(
                        data
                    )


                if not isinstance(
                    data,
                    dict,
                ):

                    continue


                # Usually inside "res".
                res = data.get(
                    "res",
                    data,
                )


                page_texts = res.get(
                    "rec_texts",
                    [],
                )


                for text in page_texts:

                    if text:

                        texts.append(
                            str(text).strip()
                        )


            except Exception:

                continue


    return texts


# =========================================================
# OLD PADDLEOCR FORMAT
# =========================================================

def _extract_old_format(
    result,
) -> list[str]:

    texts = []


    if not result:

        return texts


    try:

        for page in result:

            if not page:

                continue


            for line in page:

                try:

                    # Typical format:
                    #
                    # [
                    #   bounding_box,
                    #   ["text", confidence]
                    # ]

                    if (
                        isinstance(
                            line,
                            list,
                        )
                        and len(line) >= 2
                    ):

                        information = (
                            line[1]
                        )


                        if (
                            isinstance(
                                information,
                                (list, tuple),
                            )
                            and len(
                                information
                            ) >= 1
                        ):

                            text = (
                                information[0]
                            )


                            if text:

                                texts.append(
                                    str(
                                        text
                                    ).strip()
                                )

                except Exception:

                    continue


    except Exception:

        pass


    return texts


# =========================================================
# REMOVE DUPLICATES
# =========================================================

def _clean_text(
    texts: list[str],
) -> str:

    cleaned = []

    seen = set()


    for text in texts:

        value = (
            str(text)
            .strip()
        )


        if not value:

            continue


        key = value.lower()


        if key in seen:

            continue


        seen.add(key)

        cleaned.append(
            value
        )


    return "\n".join(
        cleaned
    )


# =========================================================
# MAIN OCR FUNCTION
# =========================================================

def extract_text(
    image_path: str,
) -> str:

    ocr = get_ocr_engine()


    # -----------------------------------------------------
    # Run OCR
    # -----------------------------------------------------

    try:

        # New PaddleOCR versions
        if hasattr(
            ocr,
            "predict",
        ):

            result = ocr.predict(
                image_path
            )

        # Older PaddleOCR versions
        else:

            result = ocr.ocr(
                image_path
            )


    except Exception as exc:

        raise RuntimeError(
            f"OCR processing failed: {exc}"
        ) from exc


    # -----------------------------------------------------
    # Try new result format
    # -----------------------------------------------------

    texts = _extract_new_format(
        result
    )


    # -----------------------------------------------------
    # If nothing found, try old format
    # -----------------------------------------------------

    if not texts:

        texts = _extract_old_format(
            result
        )


    # -----------------------------------------------------
    # Clean OCR output
    # -----------------------------------------------------

    extracted_text = _clean_text(
        texts
    )


    if not extracted_text:

        raise ValueError(
            "OCR could not detect readable "
            "text in the prescription."
        )


    return extracted_text