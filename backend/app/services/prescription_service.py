"""Account-owned Prescription workflow, independent of other service pipelines."""
import asyncio
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi.concurrency import run_in_threadpool

from app.db.mongodb import database
from app.services.prescription_storage import delete_original
from app.services.prescription_ocr import extract_document, image_pages
from app.services.prescription_name_index import recognized_name
from app.services.prescription_structure import extract_document_details, extract_prescribed_instructions, is_instruction_continuation
from app.services.prescription_reference import (
    load_extra_catalogue, normalized, pharmacy_links, reference_for,
)

prescriptions_collection = database["prescriptions"]
STORAGE = Path(__file__).resolve().parents[1] / "uploads" / "prescription-private"


def serialize(document):
    if not document:
        return None
    result = {key: value for key, value in document.items() if key not in {"_id", "file_path", "user_id", "storage_file_id", "storage_provider"}}
    result["id"] = str(document["_id"])
    # Older saved uploads gain a readable view from stored text only. No OCR or
    # external medicine lookup is rerun and the stored record is not changed.
    if result.get("raw_text") and not (result.get("document_details") or {}).get("reviewed"):
        result["document_details"] = extract_document_details(result["raw_text"], [m.get("source_text", "") for m in result.get("medicines", [])])
    result["medicines"] = [
        {**medicine, "prescribed": medicine.get("prescribed") or extract_prescribed_instructions(medicine.get("instructions") or medicine.get("source_text", ""))}
        for medicine in result.get("medicines", [])
    ]
    for key in ["created_at", "updated_at", "analyzed_at"]:
        if isinstance(result.get(key), datetime):
            result[key] = result[key].isoformat()
    return result


async def catalogue():
    # Read-only use of the existing catalogue. No changes to Medicine Recommender.
    rows = await database["medicine_catalogue"].find({}, {"_id": 0}).to_list(length=20000)
    rows.extend(await run_in_threadpool(load_extra_catalogue))
    return rows


def parse_candidates(text, rows):
    result = []
    prefix = r"(?:tab(?:let)?s?|cap(?:sule)?s?|syrup|syp|inj(?:ection)?|i\.?v\.?|infusion|cream|ointment|drops?|gel|sachets?|solution)"
    non_medicine = r"^(?:age|patient|doctor|date|blood\s+(?:pressure|sugar)|bp|pulse|weight|temperature|diagnosis|hospital|clinic|allergies|follow[\s-]*up)\s*[:=]"
    strength_pattern = r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)(?:\s*/\s*\d*(?:\.\d+)?\s*(?:mg|mcg|g|ml))?\b|\b\d+(?:\.\d+)?\s*%"
    quantity_pattern = r"\b\d+(?:/\d+|\.\d+)?\s*(?:tablets?|tabs?|capsules?|caps?|sachets?|drops?|puffs?|vials?|ampoules?)\b"
    # Literal medication-category names are recognition hints, not clinical data.
    supportive = {"ors", "oral rehydration salts", "dextrose", "normal saline", "sodium chloride", "ringer lactate", "ringers lactate"}
    aliases = set()
    for row in rows:
        for value in [row.get("name"), row.get("brand_name"), row.get("generic_name"), *row.get("brand_names", [])]:
            if isinstance(value, str) and value.strip():
                aliases.add(normalized(value))
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        clean = re.sub(r"^\s*(?:[\-\u2013\u2014\u2192\u2022]+|\d+[.)])\s*", "", line)
        form_match = re.match(rf"^({prefix})(?:[.\s:]|$)", clean, re.I)
        has_prefix = form_match is not None
        if re.match(non_medicine, clean, re.I):
            continue
        if result and not has_prefix and is_instruction_continuation(clean):
            result[-1]["source_text"] += "\n" + line
            if not result[-1]["strength"]:
                dose = re.search(strength_pattern, clean, re.I)
                if dose:
                    result[-1]["strength"] = dose.group()
            continue
        if form_match:
            clean = clean[form_match.end():].lstrip(" .:")
        dose = re.search(strength_pattern, clean, re.I)
        quantity = re.search(quantity_pattern, clean, re.I)
        if dose:
            before = clean[:dose.start()].strip()
            if re.search(r"[^\W\d_]", before):
                name = before
            else:
                name = clean[dose.end():].lstrip(" ,:")
        elif quantity:
            name = clean[:quantity.start()].strip()
        else:
            name = clean
        name = re.split(r"\s+(?:OD|BD|BID|TID|TDS|QID|HS|SOS|PRN|for|take|once|twice|morning|afternoon|evening|night|before|after|stat\.?|\(?IV\)?|IM|SC|[01]-[01]-[01])\b", name, flags=re.I)[0].strip(" ,;.")
        # A clearly recognized category may be followed by unreadable quantity
        # text. Preserve that text; do not silently correct it into a dose.
        for term in sorted(supportive, key=len, reverse=True):
            match = re.match(rf"^({re.escape(term)})(?=\s|$)", name, re.I)
            if match and (not name[match.end():].strip() or re.match(r"^\s+\d", name[match.end():])):
                name = match.group(1)
                break
        if not name or len(name) > 140 or not re.search(r"[^\W\d_]", name) or ":" in name:
            continue
        known_name = normalized(name) in aliases or normalized(name) in supportive or recognized_name(name)
        if not (has_prefix or dose or quantity or known_name):
            continue
        # Unknown observation values with a percent sign are not drug identities.
        if dose and "%" in dose.group() and not (known_name or has_prefix):
            continue
        form = form_match.group(1).lower().replace(".", "") if form_match else ""
        canonical_form = {"tab": "tablet", "tabs": "tablet", "tablets": "tablet", "cap": "capsule", "caps": "capsule", "capsules": "capsule", "syp": "syrup", "inj": "injection", "drop": "drops", "sachets": "sachet", "iv": "IV"}.get(form, form)
        result.append({"medicine_name": name, "strength": dose.group() if dose else "", "dosage_form": canonical_form, "source_text": line, "needs_verification": True, "user_confirmed": False, "reference_status": "pending", "generic_name": None, "pharmacy_options": []})
        if len(result) >= 30:
            break
    for item in result:
        item["instructions"] = item["source_text"][:1000]
        item["source_text"] = item["source_text"][:2000]
        item["prescribed"] = extract_prescribed_instructions(item["source_text"])
    return result


REFERENCE_BUDGET_SECONDS = 6.0


def unavailable_reference(note):
    return {"reference_status": "unavailable", "generic_name": None, "uses": [], "side_effects": [], "precautions": [], "age_restrictions": {}, "sources": [], "reference_note": note}


async def enrich_references(medicines, rows, confirmed=False):
    """Keep completed references; bound the total wait for optional lookups."""
    if not medicines:
        return []
    semaphore = asyncio.Semaphore(3)
    def combine(medicine, info):
        available = info.get("reference_status") in {"catalogue_match", "label_match", "category_match"}
        return {**medicine, **info, "user_confirmed": confirmed, "needs_verification": not confirmed or not available,
                "pharmacy_options": pharmacy_links(medicine["medicine_name"], medicine.get("strength", ""), medicine.get("dosage_form", "")) if available else []}
    async def enrich(medicine):
        try:
            async with semaphore:
                # Cancellation stops waiting; socket timeouts bound outstanding I/O.
                info = await asyncio.to_thread(reference_for, medicine["medicine_name"], medicine.get("strength", ""), medicine.get("dosage_form", ""), rows)
        except Exception:
            info = unavailable_reference("The reference lookup is temporarily unavailable. The extracted prescription text is still saved.")
        return combine(medicine, info)
    tasks = [asyncio.create_task(enrich(medicine)) for medicine in medicines]
    pending = set(tasks)
    try:
        _, pending = await asyncio.wait(tasks, timeout=REFERENCE_BUDGET_SECONDS)
        timed_out = unavailable_reference("Medicine information lookup took too long. The detected name and written instructions are saved. Retry the analysis later to look up sourced information.")
        return [combine(medicine, timed_out) if task in pending else task.result() for medicine, task in zip(medicines, tasks)]
    finally:
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)


async def reference_candidates(medicines, rows):
    return await enrich_references(medicines, rows)


async def analyze_prescription(*, filename, user_id, prescription_id, file_path=None, file_content=None):
    # Hosted uploads need no local disk; preserve the optional legacy file input.
    content = file_content if file_content is not None else await run_in_threadpool(Path(file_path).read_bytes)
    pages = await run_in_threadpool(image_pages, content, Path(filename).suffix.lower())
    ocr = await run_in_threadpool(extract_document, pages, STORAGE)
    if not ocr["text"]:
        raise ValueError("No readable text was found. Upload a clearer image or ask a pharmacist to read the prescription.")
    rows = await catalogue()
    candidates = parse_candidates(ocr["text"], rows)
    for reading in ocr.get("medicine_readings", []):
        for medicine in parse_candidates(reading["text"], rows):
            if normalized(medicine["medicine_name"]) not in {normalized(item["medicine_name"]) for item in candidates} and len(candidates) < 30:
                medicine["recognition_method"] = reading["method"]
                candidates.append(medicine)
    medicines = await reference_candidates(candidates, rows)
    now = datetime.now(timezone.utc)
    values = {
        "status": "needs_review", "raw_text": ocr["text"], "ocr_provider": ocr["provider"],
        "ocr_confidence": ocr["confidence"], "ocr_passes": ocr.get("passes", []), "medicine_readings": ocr.get("medicine_readings", []), "page_count": len(pages), "medicines": medicines,
        "document_details": extract_document_details(ocr["text"], [m["source_text"] for m in medicines]),
        "warnings": ["Review the original document and every medicine name, strength and instruction. OCR confidence is not medical certainty.", "An empty candidate list means OCR could not confidently identify medicine names. All recognized text remains available; this does not prove there are no medicines on the prescription."],
        "updated_at": now, "version": 1,
    }
    await prescriptions_collection.update_one({"_id": prescription_id, "user_id": user_id}, {"$set": values})
    return await get_prescription_by_id(prescription_id, user_id)


async def get_prescription_by_id(prescription_id, user_id):
    return serialize(await prescriptions_collection.find_one({"_id": prescription_id, "user_id": user_id}))


async def get_prescription_history(user_id):
    records = await prescriptions_collection.find({"user_id": user_id}).sort("created_at", -1).to_list(length=None)
    return [serialize(row) for row in records]


async def confirm_prescription(prescription_id, user_id, items, version, document_fields=None):
    document = await prescriptions_collection.find_one({"_id": prescription_id, "user_id": user_id})
    if not document:
        return None
    if document.get("status") not in {"needs_review", "completed"} or document.get("version", 1) != version:
        raise ValueError("This prescription changed. Refresh it before saving your review.")
    rows = await catalogue()
    reviewed = []
    for item in items:
        data = item.model_dump()
        explicit = data.pop("prescribed", None)
        data["prescribed"] = explicit if explicit is not None else extract_prescribed_instructions(data.get("instructions") or data.get("source_text", ""))
        reviewed.append(data)
    medicines = await enrich_references(reviewed, rows, confirmed=True)
    now = datetime.now(timezone.utc)
    document_details = dict(document.get("document_details") or extract_document_details(document.get("raw_text", ""), [m.get("source_text", "") for m in medicines]))
    if document_fields is not None:
        document_details["fields"] = [{**field.model_dump(), "user_confirmed": True} for field in document_fields]
        document_details["reviewed"] = True
    update = await prescriptions_collection.update_one(
        {"_id": prescription_id, "user_id": user_id, "version": document.get("version")},
        {"$set": {"medicines": medicines, "document_details": document_details, "status": "completed", "analyzed_at": now, "updated_at": now, "version": version + 1}},
    )
    if not update.modified_count:
        raise ValueError("This prescription changed while saving. Refresh before trying again.")
    return await get_prescription_by_id(prescription_id, user_id)


async def delete_prescription(prescription_id, user_id):
    query = {"_id": prescription_id, "user_id": user_id}
    existing = await prescriptions_collection.find_one(query)
    if existing and existing.get("status") == "processing":
        raise ValueError("Wait for this upload to finish processing before deleting it.")
    if not existing:
        return False
    # Keep the history row if storage deletion fails, so cleanup can be retried.
    await delete_original(existing, STORAGE)
    document = await prescriptions_collection.find_one_and_delete(query)
    return bool(document)
