from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import (
    getSampleStyleSheet,
    ParagraphStyle,
)
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


# =========================================================
# HELPERS
# =========================================================

def _safe_value(value, default="Not specified"):
    """
    Safely convert values into printable text.
    """

    if value is None:
        return default

    if isinstance(value, str):

        value = value.strip()

        if not value:
            return default

        return value

    return str(value)


def _list_to_text(
    value,
    default="Not specified",
):
    """
    Convert a list into readable text.
    """

    if value is None:
        return default

    if isinstance(value, str):

        return (
            value.strip()
            if value.strip()
            else default
        )

    if isinstance(value, (list, tuple, set)):

        values = []

        for item in value:

            text = _safe_value(
                item,
                default="",
            )

            if text:
                values.append(text)

        if values:
            return ", ".join(values)

        return default

    return _safe_value(
        value,
        default,
    )


def _paragraph_text(value):
    """
    Escape text before placing it inside a ReportLab
    Paragraph.
    """

    return escape(
        _safe_value(value)
    ).replace(
        "\n",
        "<br/>",
    )


def _medicine_name(medicine):
    """
    Safely get the medicine name regardless of whether
    the parser uses medicine_name or name.
    """

    return (
        medicine.get("medicine_name")
        or medicine.get("name")
        or "Unknown Medicine"
    )


def _generic_name(medicine):
    return (
        medicine.get("generic_name")
        or "Not identified"
    )


def _confidence_text(medicine):
    confidence = medicine.get(
        "confidence"
    )

    if confidence is None:
        return "Not available"

    try:

        confidence = float(
            confidence
        )

        if confidence <= 1:
            confidence *= 100

        return f"{confidence:.0f}%"

    except (
        TypeError,
        ValueError,
    ):
        return str(confidence)


def _verification_text(medicine):
    if medicine.get(
        "needs_verification",
        False,
    ):
        return (
            "YES - Manual verification required"
        )

    return "No"


# =========================================================
# PAGE HEADER / FOOTER
# =========================================================

def _draw_page_header_footer(
    canvas,
    document,
):
    canvas.saveState()

    width, height = A4

    # Header line
    canvas.setStrokeColor(
        colors.HexColor("#D9E2EC")
    )

    canvas.line(
        18 * mm,
        height - 15 * mm,
        width - 18 * mm,
        height - 15 * mm,
    )

    canvas.setFont(
        "Helvetica",
        8,
    )

    canvas.setFillColor(
        colors.HexColor("#667085")
    )

    canvas.drawString(
        18 * mm,
        height - 11 * mm,
        "MedVisionRx",
    )

    # Footer
    canvas.line(
        18 * mm,
        15 * mm,
        width - 18 * mm,
        15 * mm,
    )

    canvas.drawString(
        18 * mm,
        9 * mm,
        "Prescription Analysis Report",
    )

    canvas.drawRightString(
        width - 18 * mm,
        9 * mm,
        f"Page {document.page}",
    )

    canvas.restoreState()


# =========================================================
# REPORT GENERATOR
# =========================================================

def generate_report(
    prescription: dict,
    output_path: str,
):
    """
    Generate a complete MedVisionRx prescription
    analysis PDF.
    """

    output_file = Path(
        output_path
    )

    output_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # -----------------------------------------------------
    # DOCUMENT
    # -----------------------------------------------------

    document = SimpleDocTemplate(
        str(output_file),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=20 * mm,
        title="MedVisionRx Prescription Report",
        author="MedVisionRx",
    )

    # -----------------------------------------------------
    # STYLES
    # -----------------------------------------------------

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "MedVisionTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=27,
        alignment=TA_CENTER,
        spaceAfter=6,
        textColor=colors.HexColor(
            "#123B5D"
        ),
    )

    subtitle_style = ParagraphStyle(
        "MedVisionSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        alignment=TA_CENTER,
        spaceAfter=16,
        textColor=colors.HexColor(
            "#667085"
        ),
    )

    section_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        spaceBefore=12,
        spaceAfter=8,
        textColor=colors.HexColor(
            "#123B5D"
        ),
    )

    medicine_style = ParagraphStyle(
        "MedicineHeading",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        spaceBefore=8,
        spaceAfter=6,
        textColor=colors.HexColor(
            "#123B5D"
        ),
    )

    body_style = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        spaceAfter=5,
        textColor=colors.HexColor(
            "#344054"
        ),
    )

    small_style = ParagraphStyle(
        "SmallTextCustom",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor(
            "#667085"
        ),
    )

    warning_style = ParagraphStyle(
        "WarningText",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor(
            "#8A4B08"
        ),
    )

    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8,
        leading=12,
        textColor=colors.HexColor(
            "#667085"
        ),
    )

    # -----------------------------------------------------
    # STORY
    # -----------------------------------------------------

    story = []

    # -----------------------------------------------------
    # TITLE
    # -----------------------------------------------------

    story.append(
        Paragraph(
            "MedVisionRx",
            title_style,
        )
    )

    story.append(
        Paragraph(
            "Prescription Analysis Report",
            subtitle_style,
        )
    )

    # -----------------------------------------------------
    # PRESCRIPTION INFORMATION
    # -----------------------------------------------------

    story.append(
        Paragraph(
            "Prescription Information",
            section_style,
        )
    )

    created_at = prescription.get(
        "created_at"
    )

    if hasattr(
        created_at,
        "isoformat",
    ):
        created_at = (
            created_at.isoformat()
        )

    prescription_info = [
        [
            "Prescription ID",
            _safe_value(
                prescription.get(
                    "_id"
                )
                or prescription.get(
                    "id"
                )
            ),
        ],
        [
            "File Name",
            _safe_value(
                prescription.get(
                    "filename"
                )
            ),
        ],
        [
            "Status",
            _safe_value(
                prescription.get(
                    "status"
                ),
                default="Completed",
            ),
        ],
        [
            "Doctor",
            _safe_value(
                prescription.get(
                    "doctor_name"
                )
            ),
        ],
        [
            "Patient",
            _safe_value(
                prescription.get(
                    "patient_name"
                )
            ),
        ],
        [
            "Prescription Date",
            _safe_value(
                prescription.get(
                    "prescription_date"
                )
            ),
        ],
        [
            "Analyzed At",
            _safe_value(
                created_at
            ),
        ],
    ]

    info_table = Table(
        prescription_info,
        colWidths=[
            45 * mm,
            125 * mm,
        ],
    )

    info_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (0, -1),
                    colors.HexColor(
                        "#F2F6FA"
                    ),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, -1),
                    colors.HexColor(
                        "#344054"
                    ),
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (0, -1),
                    "Helvetica-Bold",
                ),
                (
                    "FONTNAME",
                    (1, 0),
                    (1, -1),
                    "Helvetica",
                ),
                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor(
                        "#D9E2EC"
                    ),
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
            ]
        )
    )

    story.append(
        info_table
    )

    story.append(
        Spacer(
            1,
            8,
        )
    )

    # -----------------------------------------------------
    # MEDICINES
    # -----------------------------------------------------

    medicines = prescription.get(
        "medicines",
        [],
    )

    story.append(
        Paragraph(
            "Detected Medicines",
            section_style,
        )
    )

    if not medicines:

        story.append(
            Paragraph(
                "No medicines were identified.",
                body_style,
            )
        )

    else:

        for index, medicine in enumerate(
            medicines,
            start=1,
        ):

            medicine_name = _safe_value(
                _medicine_name(
                    medicine
                ),
                default="Unknown Medicine",
            )

            # IMPORTANT:
            # Keep this construction simple.
            # This avoids the nested f-string syntax
            # problem from the previous version.

            medicine_title = (
                f"{index}. "
                f"{medicine_name}"
            )

            story.append(
                Paragraph(
                    escape(
                        medicine_title
                    ),
                    medicine_style,
                )
            )

            medicine_data = [
                [
                    "Generic Name",
                    _generic_name(
                        medicine
                    ),
                ],
                [
                    "Strength",
                    _safe_value(
                        medicine.get(
                            "strength"
                        )
                    ),
                ],
                [
                    "Dosage",
                    _safe_value(
                        medicine.get(
                            "dosage"
                        )
                        or medicine.get(
                            "dosage_instruction"
                        )
                    ),
                ],
                [
                    "Frequency",
                    _safe_value(
                        medicine.get(
                            "frequency"
                        )
                    ),
                ],
                [
                    "Duration",
                    _safe_value(
                        medicine.get(
                            "duration"
                        )
                    ),
                ],
                [
                    "Dosage Form",
                    _safe_value(
                        medicine.get(
                            "dosage_form"
                        )
                    ),
                ],
                [
                    "Confidence",
                    _confidence_text(
                        medicine
                    ),
                ],
                [
                    "Manual Verification",
                    _verification_text(
                        medicine
                    ),
                ],
                [
                    "Purpose",
                    _list_to_text(
                        medicine.get(
                            "purpose"
                        )
                        or medicine.get(
                            "uses"
                        )
                    ),
                ],
                [
                    "Side Effects",
                    _list_to_text(
                        medicine.get(
                            "side_effects"
                        )
                    ),
                ],
                [
                    "Precautions",
                    _list_to_text(
                        medicine.get(
                            "precautions"
                        )
                    ),
                ],
            ]

            medicine_table = Table(
                medicine_data,
                colWidths=[
                    42 * mm,
                    128 * mm,
                ],
            )

            medicine_table.setStyle(
                TableStyle(
                    [
                        (
                            "BACKGROUND",
                            (0, 0),
                            (0, -1),
                            colors.HexColor(
                                "#F8FAFC"
                            ),
                        ),
                        (
                            "FONTNAME",
                            (0, 0),
                            (0, -1),
                            "Helvetica-Bold",
                        ),
                        (
                            "FONTNAME",
                            (1, 0),
                            (1, -1),
                            "Helvetica",
                        ),
                        (
                            "FONTSIZE",
                            (0, 0),
                            (-1, -1),
                            8,
                        ),
                        (
                            "TEXTCOLOR",
                            (0, 0),
                            (-1, -1),
                            colors.HexColor(
                                "#344054"
                            ),
                        ),
                        (
                            "GRID",
                            (0, 0),
                            (-1, -1),
                            0.4,
                            colors.HexColor(
                                "#D9E2EC"
                            ),
                        ),
                        (
                            "VALIGN",
                            (0, 0),
                            (-1, -1),
                            "TOP",
                        ),
                        (
                            "LEFTPADDING",
                            (0, 0),
                            (-1, -1),
                            6,
                        ),
                        (
                            "RIGHTPADDING",
                            (0, 0),
                            (-1, -1),
                            6,
                        ),
                        (
                            "TOPPADDING",
                            (0, 0),
                            (-1, -1),
                            5,
                        ),
                        (
                            "BOTTOMPADDING",
                            (0, 0),
                            (-1, -1),
                            5,
                        ),
                    ]
                )
            )

            story.append(
                medicine_table
            )

            # -------------------------------------------------
            # PHARMACY LINKS
            # -------------------------------------------------

            pharmacy_options = medicine.get(
                "pharmacy_options",
                [],
            )

            if pharmacy_options:

                story.append(
                    Spacer(
                        1,
                        5,
                    )
                )

                story.append(
                    Paragraph(
                        "<b>Online Pharmacy Search</b>",
                        body_style,
                    )
                )

                pharmacy_rows = []

                for option in pharmacy_options:

                    store = _safe_value(
                        option.get(
                            "store"
                        ),
                        default="Pharmacy",
                    )

                    url = option.get(
                        "url"
                    )

                    if url:

                        link = (
                            f'<link href="{escape(url)}" '
                            f'color="#1769AA">'
                            f'{escape(store)}'
                            f'</link>'
                        )

                        pharmacy_rows.append(
                            [
                                Paragraph(
                                    link,
                                    small_style,
                                ),
                                _safe_value(
                                    option.get(
                                        "action"
                                    ),
                                    default="Search medicine",
                                ),
                            ]
                        )

                if pharmacy_rows:

                    pharmacy_table = Table(
                        pharmacy_rows,
                        colWidths=[
                            70 * mm,
                            100 * mm,
                        ],
                    )

                    pharmacy_table.setStyle(
                        TableStyle(
                            [
                                (
                                    "GRID",
                                    (0, 0),
                                    (-1, -1),
                                    0.3,
                                    colors.HexColor(
                                        "#D9E2EC"
                                    ),
                                ),
                                (
                                    "FONTSIZE",
                                    (0, 0),
                                    (-1, -1),
                                    8,
                                ),
                                (
                                    "VALIGN",
                                    (0, 0),
                                    (-1, -1),
                                    "MIDDLE",
                                ),
                                (
                                    "LEFTPADDING",
                                    (0, 0),
                                    (-1, -1),
                                    6,
                                ),
                                (
                                    "RIGHTPADDING",
                                    (0, 0),
                                    (-1, -1),
                                    6,
                                ),
                                (
                                    "TOPPADDING",
                                    (0, 0),
                                    (-1, -1),
                                    5,
                                ),
                                (
                                    "BOTTOMPADDING",
                                    (0, 0),
                                    (-1, -1),
                                    5,
                                ),
                            ]
                        )
                    )

                    story.append(
                        pharmacy_table
                    )

            story.append(
                Spacer(
                    1,
                    10,
                )
            )

    # -----------------------------------------------------
    # GENERIC RECOMMENDATIONS
    # -----------------------------------------------------

    recommendations = prescription.get(
        "recommendations",
        [],
    )

    if recommendations:

        story.append(
            Paragraph(
                "Generic Medicine Information",
                section_style,
            )
        )

        recommendation_rows = [
            [
                "Medicine",
                "Generic",
                "Status",
            ]
        ]

        for recommendation in recommendations:

            recommendation_rows.append(
                [
                    _safe_value(
                        recommendation.get(
                            "medicine_name"
                        )
                    ),
                    _safe_value(
                        recommendation.get(
                            "generic_name"
                        )
                    ),
                    (
                        "Available"
                        if recommendation.get(
                            "recommendation_available"
                        )
                        else "Verification required"
                    ),
                ]
            )

        recommendation_table = Table(
            recommendation_rows,
            colWidths=[
                55 * mm,
                55 * mm,
                60 * mm,
            ],
            repeatRows=1,
        )

        recommendation_table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor(
                            "#123B5D"
                        ),
                    ),
                    (
                        "TEXTCOLOR",
                        (0, 0),
                        (-1, 0),
                        colors.white,
                    ),
                    (
                        "FONTNAME",
                        (0, 0),
                        (-1, 0),
                        "Helvetica-Bold",
                    ),
                    (
                        "FONTNAME",
                        (0, 1),
                        (-1, -1),
                        "Helvetica",
                    ),
                    (
                        "FONTSIZE",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.4,
                        colors.HexColor(
                            "#D9E2EC"
                        ),
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP",
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                ]
            )
        )

        story.append(
            recommendation_table
        )

        story.append(
            Spacer(
                1,
                6,
            )
        )

        story.append(
            Paragraph(
                "Generic-name information is provided for "
                "reference only. Do not substitute a prescribed "
                "medicine without confirmation from a doctor "
                "or pharmacist.",
                warning_style,
            )
        )

    # -----------------------------------------------------
    # INTERACTIONS
    # -----------------------------------------------------

    interactions = prescription.get(
        "interactions",
        [],
    )

    story.append(
        Paragraph(
            "Interaction Warnings",
            section_style,
        )
    )

    if interactions:

        for interaction in interactions:

            if isinstance(
                interaction,
                dict,
            ):

                message = (
                    interaction.get(
                        "message"
                    )
                    or interaction.get(
                        "warning"
                    )
                    or str(
                        interaction
                    )
                )

            else:

                message = str(
                    interaction
                )

            story.append(
                Paragraph(
                    "• "
                    + _paragraph_text(
                        message
                    ),
                    warning_style,
                )
            )

    else:

        story.append(
            Paragraph(
                "No interaction warning was generated "
                "by the configured interaction-checking layer.",
                body_style,
            )
        )

    # -----------------------------------------------------
    # GENERAL WARNINGS
    # -----------------------------------------------------

    warnings = prescription.get(
        "warnings",
        [],
    )

    if warnings:

        story.append(
            Paragraph(
                "General Warnings",
                section_style,
            )
        )

        for warning in warnings:

            story.append(
                Paragraph(
                    "• "
                    + _paragraph_text(
                        warning
                    ),
                    warning_style,
                )
            )

    # -----------------------------------------------------
    # RAW OCR
    # -----------------------------------------------------

    raw_text = prescription.get(
        "raw_text"
    )

    story.append(
        PageBreak()
    )

    story.append(
        Paragraph(
            "Raw OCR Text",
            section_style,
        )
    )

    if raw_text:

        story.append(
            Paragraph(
                _paragraph_text(
                    raw_text
                ),
                small_style,
            )
        )

    else:

        story.append(
            Paragraph(
                "No OCR text available.",
                body_style,
            )
        )

    # -----------------------------------------------------
    # MEDICAL DISCLAIMER
    # -----------------------------------------------------

    story.append(
        Spacer(
            1,
            15,
        )
    )

    story.append(
        Paragraph(
            "Medical Disclaimer",
            section_style,
        )
    )

    disclaimer = (
        "MedVisionRx is an informational prescription "
        "analysis system. OCR and medicine identification "
        "can contain errors, especially with handwritten, "
        "blurred, damaged, abbreviated, or unclear prescriptions. "
        "The information in this report must not be treated "
        "as a diagnosis or as a replacement for advice from "
        "a qualified doctor or pharmacist. Always verify "
        "medicine names, dosage, frequency, duration, "
        "interactions, and any generic substitution with "
        "a qualified healthcare professional before taking "
        "or changing medication."
    )

    story.append(
        Paragraph(
            disclaimer,
            disclaimer_style,
        )
    )

    # -----------------------------------------------------
    # BUILD PDF
    # -----------------------------------------------------

    document.build(
        story,
        onFirstPage=(
            _draw_page_header_footer
        ),
        onLaterPages=(
            _draw_page_header_footer
        ),
    )

    return str(
        output_file
    )