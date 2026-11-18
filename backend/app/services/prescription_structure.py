"""Literal prescription structuring. No personal dose is inferred from drug references."""
import re

FIELD_PATTERNS = [
    ("hospital_name", "Hospital / clinic", r"(?:hospital(?:\s+name)?|clinic(?:\s+name)?|medical\s+cent(?:re|er))"),
    ("doctor_name", "Doctor", r"(?:doctor(?:\s+name)?|physician|consultant|prescriber)"),
    ("doctor_registration", "Doctor registration", r"(?:reg(?:istration)?\.?\s*(?:no\.?|number)|medical\s+registration)"),
    ("patient_name", "Patient name", r"(?:patient(?:\s+name)?|name\s+of\s+patient)"),
    ("patient_dob", "Patient date of birth", r"(?:date\s+of\s+birth|dob)"),
    ("age_sex", "Age / sex as written", r"(?:age\s*/\s*(?:sex|gender))"),
    ("name_as_written", "Name (role not specified)", r"name"),
    ("patient_age", "Patient age", r"(?:patient\s+)?age"),
    ("patient_sex", "Sex / gender", r"(?:sex|gender)"),
    ("prescription_date", "Prescription date", r"(?:prescription\s+date|date|dated)"),
    ("prescription_number", "Prescription / visit number", r"(?:prescription\s*(?:id|no\.?|number)|uhid(?:\s*/\s*ip\s*no\.?)?|op(?:d)?\s*(?:no\.?|number)|visit\s*(?:id|no\.?))"),
    ("diagnosis", "Diagnosis / complaint", r"(?:diagnosis|clinical\s+diagnosis|complaints?|c\s*/\s*o)"),
    ("allergies", "Allergies", r"(?:allergies|allergy)"),
    ("observations", "Observations", r"(?:observations?|vitals?|bp|blood\s+pressure|pulse|temperature|weight|height|blood\s+sugar)"),
    ("tests", "Tests / investigations", r"(?:tests?|investigations?|lab\s+tests?)"),
    ("advice", "Doctor's advice", r"(?:advice|advise|instructions?|notes?)"),
    ("follow_up", "Follow-up", r"(?:follow[\s-]*up|review\s+(?:date|after)|next\s+visit)"),
    ("contact", "Contact", r"(?:phone|telephone|tel\.?|mobile|contact|email)"),
    ("address", "Address", r"(?:address)"),
]


def extract_document_details(text, medicine_lines):
    """Keep source evidence and every unclassified line, rather than guess a header."""
    fields, remaining, used = [], [], set()
    lines = []
    label_union = "|".join(pattern for _, _, pattern in FIELD_PATTERNS)
    for original in text.splitlines():
        if not original.strip():
            continue
        # Split explicitly labelled inline fields such as Patient: A  Age: 20.
        parts = re.split(rf"\s+(?=(?:{label_union})\s*[:=])", original.strip(), flags=re.I)
        lines.extend(part.strip() for part in parts if part.strip())
    medicine_sources = {line.strip() for source in medicine_lines for line in source.splitlines()}
    for index, line in enumerate(lines):
        if index in used or line in medicine_sources:
            continue
        matched = False
        for key, label, pattern in FIELD_PATTERNS:
            match = re.match(rf"^\s*{pattern}(?:\s*[:=]\s*|\s*[._\u00b7]{{2,}}\s*|\s+-\s+|\s*$)(.*)$", line, re.I)
            if not match:
                continue
            value = match.group(1).strip(" ._\u00b7")
            source = line
            if not value and index + 1 < len(lines):
                following = lines[index + 1]
                is_label = any(re.match(rf"^{p}\s*(?::|[._]{{2,}}|$)", following, re.I) for _, _, p in FIELD_PATTERNS)
                if following not in medicine_sources and not is_label and len(following) <= 240:
                    value = following
                    source += "\n" + following
                    used.add(index + 1)
            if value:
                fields.append({"key": key, "label": label, "value": value, "source_text": source, "user_confirmed": False})
                matched = True
                break
        if not matched and re.match(r"^Dr\.?\s+\S", line, re.I):
            fields.append({"key": "doctor_name", "label": "Doctor", "value": line, "source_text": line, "user_confirmed": False})
            matched = True
        if not matched and re.search(r"\b(?:hospital|clinic|medical centre|medical center)\b", line, re.I) and len(line) <= 240:
            fields.append({"key": "hospital_name", "label": "Hospital / clinic", "value": line, "source_text": line, "user_confirmed": False})
            matched = True
        if not matched:
            remaining.append(line)
    essentials = [
        ("hospital_name", "Hospital / clinic"), ("doctor_name", "Doctor"), ("patient_name", "Patient name"),
        ("patient_age", "Patient age"), ("patient_sex", "Sex / gender"), ("prescription_date", "Prescription date"),
    ]
    present = {field["key"] for field in fields}
    for key, label in essentials:
        if key not in present:
            fields.append({"key": key, "label": label, "value": "", "source_text": "", "user_confirmed": False})
    for field in fields:
        field["value"] = field["value"][:1500]
        field["source_text"] = field["source_text"][:2000]
    return {"fields": fields[:80], "remaining_text": "\n".join(remaining), "reviewed": False,
            "note": "Fields are OCR suggestions, not verified facts. Missing or unclear details remain unspecified. The full extracted text is retained."}


def extract_prescribed_instructions(text):
    """Extract literal timing; never map an unlabeled schedule code onto day parts."""
    value = re.sub(r"\s+", " ", text).strip()
    result = {key: "" for key in ["dose", "frequency", "duration", "morning", "afternoon", "evening", "night", "meal_instructions", "schedule_code"]}
    dose = re.search(r"\b(?:take\s+)?(\d+(?:\.\d+|/\d+)?\s*(?:tablets?|capsules?|tabs?|caps?|drops?|puffs?|sachets?|teaspoons?))\b", value, re.I)
    if not dose:
        dose = re.search(r"\b(?:take|dose\s*:)\s*(\d+(?:\.\d+)?\s*(?:ml|mg|mcg|g|iu))\b", value, re.I)
    if dose:
        result["dose"] = dose.group(1)
    frequency = re.search(r"\b(?:once|twice|three\s+times|four\s+times|\d+\s+times)\s+(?:a\s+day|per\s+day|daily)|\bevery\s+\d+\s+hours?\b", value, re.I)
    if frequency:
        result["frequency"] = frequency.group()
    else:
        abbreviation = re.search(r"\b(?:OD|BD|BID|TID|TDS|QID|HS|SOS|PRN|AC|PC)\b", value, re.I)
        if abbreviation:
            result["frequency"] = abbreviation.group() + " (abbreviation as written; confirm its meaning)"
    duration = re.search(r"\b(?:for\s+)?\d+\s*(?:days?|weeks?|months?)\b|\bx\s*\d+\s*d\b", value, re.I)
    if duration:
        result["duration"] = duration.group()
    code = re.search(r"(?<![\w/\d-])(?:[0-3](?:/2)?\s*[-?]\s*){2,3}[0-3](?:/2)?(?![\w/\d-])", value)
    if code:
        result["schedule_code"] = code.group()
    for slot in ["morning", "afternoon", "evening", "night"]:
        explicit = re.search(rf"\b{slot}\b(?:\s*:\s*|\s+)(\d+(?:/\d+|\.\d+)?(?:\s*(?:tablets?|capsules?|ml|drops?|puffs?))?)\b", value, re.I)
        if explicit:
            result[slot] = explicit.group(1)
        elif re.search(rf"\b{slot}\b", value, re.I):
            result[slot] = "Mentioned; dose not separately specified"
    meals = re.findall(r"\b(?:before|after|with)\s+(?:(?:the|a)\s+)?(?:breakfast|lunch|dinner|food|meals?)\b|\bon\s+an\s+empty\s+stomach\b", value, re.I)
    result["meal_instructions"] = "; ".join(dict.fromkeys(meals))
    return result


def is_instruction_continuation(line):
    return bool(re.match(r"^(?:\d+(?:[/.]\d+)?\s*(?:[-?]|mg\b|ml\b|mcg\b|days?\b|weeks?\b|months?\b|tablets?\b|capsules?\b)|(?:take|for|morning|afternoon|evening|night|before|after|with|once|twice|every|OD|BD|BID|TID|TDS|HS|SOS|PRN)\b)", line, re.I))
