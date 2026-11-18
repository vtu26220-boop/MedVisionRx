"""Conservative name matching. Never turn fuzzy suggestions into a medicine."""
import json
import os
import re
from functools import lru_cache
from urllib.error import HTTPError, URLError
from urllib.parse import quote_plus, urlencode, urlparse
from urllib.request import urlopen


def normalized(value):
    return re.sub(r"\s+", " ", str(value or "").strip()).casefold()


def exact_catalogue_match(name, catalogue, strength="", form=""):
    matches = []
    for row in catalogue:
        aliases = [row.get("name"), row.get("brand_name"), row.get("generic_name"), *row.get("brand_names", [])]
        if normalized(name) in {normalized(alias) for alias in aliases if alias}:
            matches.append(row)
    ingredients = {normalized(row.get("generic_name")) for row in matches}
    # Multiple incompatible ingredients for a brand are ambiguous, not a match.
    if len(ingredients) != 1 or not next(iter(ingredients), ""):
        return None
    if strength:
        matches = [row for row in matches if not row.get("strength") or normalized(row["strength"]) == normalized(strength)]
    if form:
        matches = [row for row in matches if not row.get("dosage_form") or normalized(row["dosage_form"]) == normalized(form)]
    variants = {(normalized(row.get("strength")), normalized(row.get("dosage_form"))) for row in matches}
    return matches[0] if matches and len(variants) == 1 else None


def source_url(value):
    parsed = urlparse(str(value or ""))
    return str(value) if parsed.scheme == "https" and parsed.netloc else None


def pharmacy_links(name, strength, form):
    query = quote_plus(" ".join(str(v).strip() for v in [name, strength, form] if v))
    return [{"store": store, "url": base + query, "action": "Search pharmacy"} for store, base in [
        ("Tata 1mg", "https://www.1mg.com/search/all?name="),
        ("Apollo Pharmacy", "https://www.apollopharmacy.in/search-medicines/"),
        ("PharmEasy", "https://pharmeasy.in/search/all?name="),
        ("Netmeds", "https://www.netmeds.com/catalogsearch/result?q="),
    ]]


def load_extra_catalogue():
    path = os.getenv("PRESCRIPTION_CATALOG_PATH")
    if not path:
        return []
    with open(path, encoding="utf-8") as handle:
        rows = json.load(handle)
    if not isinstance(rows, list):
        raise ValueError("The prescription catalogue must contain a JSON array.")
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("name"), str) or not isinstance(row.get("generic_name"), str):
            raise ValueError("Every prescription catalogue entry needs a name and generic_name.")
        for key in ["brand_names", "uses", "warnings", "side_effects"]:
            if key in row and (not isinstance(row[key], list) or any(not isinstance(value, str) for value in row[key])):
                raise ValueError(f"Catalogue {key} must be a list of strings.")
        if not isinstance(row.get("age_restrictions", {}), dict):
            raise ValueError("Catalogue age_restrictions must be an object.")
        if any(value is not None and not isinstance(value, str) for value in row.get("age_restrictions", {}).values()):
            raise ValueError("Catalogue age precautions must be text.")
    return rows


@lru_cache(maxsize=512)
def public_label(name):
    """Fetch exact-name labels only; send medicine names, never prescription text."""
    safe_name = re.sub(r'[^\w\s+./-]', '', name).strip()[:140]
    if not safe_name:
        return None
    params = urlencode({"search": f'openfda.brand_name.exact:"{safe_name}" OR openfda.generic_name.exact:"{safe_name}"', "limit": 10})
    try:
        with urlopen("https://api.fda.gov/drug/label.json?" + params, timeout=5) as response:
            rows = json.load(response).get("results", [])
    except (HTTPError, URLError, TimeoutError, ValueError):
        # Outages are not cached as a confirmed absence.
        raise LookupError("Medicine reference is unavailable or has no exact label match.")
    matches = [row for row in rows if normalized(name) in {normalized(n) for n in row.get("openfda", {}).get("brand_name", []) + row.get("openfda", {}).get("generic_name", [])}]
    ingredients = {tuple(sorted(normalized(n) for n in row.get("openfda", {}).get("generic_name", []))) for row in matches}
    if not matches or len(ingredients) != 1 or not next(iter(ingredients)):
        return None
    return max(matches, key=lambda row: row.get("effective_time", ""))


def reference_for(name, strength, form, catalogue):
    row = exact_catalogue_match(name, catalogue, strength, form)
    reference = source_url(row.get("information_source")) if row else None
    if row and row.get("verified") is True and reference:
        return {
            "reference_status": "catalogue_match", "generic_name": row["generic_name"],
            "uses": row.get("uses", []), "side_effects": row.get("side_effects", []),
            "precautions": row.get("warnings", []), "age_restrictions": row.get("age_restrictions", {}),
            "sources": [{"title": "Reviewed medicine catalogue", "url": reference}],
            "reference_note": "General reference information. Confirm the exact strength and formulation with a pharmacist.",
        }
    from app.services.prescription_categories import category_reference
    category = category_reference(name, strength, form) if row is None else None
    if category:
        return category
    # A catalogue identity can supply a generic lookup, but unsourced clinical
    # descriptions are never displayed as verified reference information.
    generic = row.get("generic_name") if row else None
    try:
        label = public_label(generic or name)
    except LookupError:
        label = None
    if not label:
        return {"reference_status": "unavailable", "generic_name": None, "uses": [], "side_effects": [], "precautions": [], "age_restrictions": {}, "sources": [], "reference_note": "No unambiguous sourced reference found. Ask a pharmacist to verify the generic ingredients, uses, side effects and age suitability. No buying links are enabled."}
    fda = label.get("openfda", {})
    return {
        "reference_status": "label_match", "generic_name": "; ".join(fda.get("generic_name", [])),
        "uses": label.get("indications_and_usage", []) or label.get("purpose", []),
        "side_effects": label.get("adverse_reactions", []),
        "precautions": label.get("warnings_and_cautions", []) or label.get("warnings", []),
        "age_restrictions": {"children": "\n".join(label.get("pediatric_use", [])) or "Not established by this reference; consult the exact product label and pharmacist.", "elderly": "\n".join(label.get("geriatric_use", [])) or "Ask a pharmacist about age-related precautions."},
        "sources": [{"title": "DailyMed product label (US)", "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=" + quote_plus(label.get("set_id", ""))}],
        "reference_note": "General US product-label information for the matched name/ingredient; it may differ from your Indian brand, strength or formulation. This does not establish a personal dose or a universal age limit.",
    }
