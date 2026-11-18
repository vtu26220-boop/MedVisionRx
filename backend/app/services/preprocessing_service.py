from pathlib import Path

import cv2


# =========================================================
# PRESCRIPTION IMAGE PREPROCESSING
# =========================================================

def preprocess_image(
    image_path: str,
) -> str:
    """
    Prepare a prescription image for OCR.

    Processing:
        1. Read image
        2. Resize if too small
        3. Convert to grayscale
        4. Remove noise
        5. Improve contrast
        6. Adaptive thresholding
        7. Save processed image

    Returns:
        Path of processed image.
    """

    input_path = Path(
        image_path
    )


    # -----------------------------------------------------
    # 1. READ IMAGE
    # -----------------------------------------------------

    image = cv2.imread(
        str(input_path)
    )


    if image is None:

        raise ValueError(
            "Unable to read the uploaded "
            "prescription image."
        )


    # -----------------------------------------------------
    # 2. RESIZE
    # -----------------------------------------------------
    # OCR works better when handwritten text
    # has enough pixels.

    height, width = image.shape[:2]


    minimum_width = 1600


    if width < minimum_width:

        scale = (
            minimum_width /
            width
        )

        image = cv2.resize(
            image,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_CUBIC,
        )


    # -----------------------------------------------------
    # 3. GRAYSCALE
    # -----------------------------------------------------

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )


    # -----------------------------------------------------
    # 4. NOISE REDUCTION
    # -----------------------------------------------------

    denoised = (
        cv2.fastNlMeansDenoising(
            gray,
            None,
            h=10,
            templateWindowSize=7,
            searchWindowSize=21,
        )
    )


    # -----------------------------------------------------
    # 5. CONTRAST ENHANCEMENT
    # -----------------------------------------------------

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    )


    enhanced = clahe.apply(
        denoised
    )


    # -----------------------------------------------------
    # 6. ADAPTIVE THRESHOLD
    # -----------------------------------------------------
    # Useful when the prescription has:
    # - shadows
    # - uneven lighting
    # - light paper
    # - dark writing

    thresholded = (
        cv2.adaptiveThreshold(
            enhanced,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        )
    )


    # -----------------------------------------------------
    # 7. SAVE PROCESSED IMAGE
    # -----------------------------------------------------

    output_path = (
        input_path.parent
        / (
            f"{input_path.stem}"
            f"_processed.png"
        )
    )


    success = cv2.imwrite(
        str(output_path),
        thresholded,
    )


    if not success:

        raise ValueError(
            "Unable to save the processed "
            "prescription image."
        )


    return str(
        output_path
    )