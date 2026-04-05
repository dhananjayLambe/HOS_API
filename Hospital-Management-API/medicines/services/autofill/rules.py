from __future__ import annotations

import re

from medicines.models import DrugMaster

# Locked tables (product spec).
# Keys must include every medicines.models.DrugType value, plus "gel" (inferred from labels when DB says tablet).

DOSE_UNIT_MAP: dict[str, str] = {
    # Oral solids / liquids (aligns with MedixPro dose_unit_id where possible)
    "tablet": "tablet",
    "syrup": "ml",
    "supplement": "tablet",
    "other": "tablet",
    # Parenteral / vaccine
    "injection": "ml",
    "vaccine": "ml",
    # Respiratory
    "inhaler": "inhaler",
    # Endocrine (IU / units)
    "insulin": "units",
    # Topical / mucosal
    "cream": "gm",
    "ointment": "gm",
    "gel": "gm",
    "drop": "drops",
    # Rectal / vaginal
    "suppository": "suppository",
}

# (route_code for RouteMaster lookup, fallback display label)
ROUTE_MAP: dict[str, tuple[str, str]] = {
    "tablet": ("oral", "Oral"),
    "syrup": ("oral", "Oral"),
    "supplement": ("oral", "Oral"),
    "other": ("oral", "Oral"),
    "injection": ("iv", "IV/IM"),
    "vaccine": ("im", "IM"),
    "inhaler": ("inhalation", "Inhalation"),
    # Distinct codes so RouteMaster can seed one row each (insulin SC vs rectal are not both "other").
    "insulin": ("sc", "Subcutaneous"),
    "cream": ("topical", "Topical"),
    "ointment": ("topical", "Topical"),
    "gel": ("topical", "Topical"),
    "drop": ("topical", "Drops"),
    "suppository": ("rectal", "Rectal"),
}

INSTRUCTION_MAP: dict[str, list[str]] = {
    "tablet": ["Take after meals"],
    "syrup": ["Shake well before use"],
    "supplement": ["Take as directed on the label"],
    "other": ["Use as directed"],
    "injection": ["Use as directed; aseptic technique"],
    "vaccine": ["As directed by the clinician"],
    "inhaler": ["Rinse mouth after use if using a steroid inhaler"],
    "insulin": ["Rotate injection sites as per product leaflet"],
    "cream": ["Apply on affected area"],
    "ointment": ["Apply on affected area"],
    "gel": ["Apply on affected area"],
    "drop": ["Use as directed for the affected eye or ear"],
    "suppository": ["Use as directed"],
}

DEFAULT_ROUTE: tuple[str, str] = ("oral", "Oral")
DEFAULT_DOSE_UNIT: str = "tablet"

# Aliases for DoseUnitMaster.name lookups (stored lowercase in DB).
DOSE_UNIT_ALIASES: dict[str, str] = {
    "gm": "g",
}

ALL_DOSE_UNIT_NAMES: frozenset[str] = frozenset(
    set(DOSE_UNIT_MAP.values()) | set(DOSE_UNIT_ALIASES.keys()) | set(DOSE_UNIT_ALIASES.values())
)

ALL_ROUTE_CODES: frozenset[str] = frozenset(code for code, _ in ROUTE_MAP.values()) | {"oral"}


def dose_unit_for_type(drug_type: str) -> str:
    return DOSE_UNIT_MAP.get(drug_type) or DEFAULT_DOSE_UNIT


def resolve_effective_drug_type(drug: DrugMaster) -> str:
    """
    Prefer DrugMaster.drug_type, but infer from formulation / brand / composition when the DB
    still has the default TABLET while labels (e.g. "… + Ointment", tube pack, composition text)
    clearly indicate a topical or other form.
    """
    raw = (getattr(drug, "drug_type", None) or "").strip() or "other"

    form_name = ""
    try:
        fo = getattr(drug, "formulation", None)
        if fo is not None:
            form_name = (getattr(fo, "name", None) or "").strip().lower()
    except Exception:
        form_name = ""

    brand = (getattr(drug, "brand_name", None) or "").strip().lower()
    composition = (getattr(drug, "composition", None) or "").strip().lower()
    # Single blob: catches split names ("1 Oxytime +" + composition mentions ointment) and tube packs.
    text_blob = f"{form_name} {brand} {composition}".strip()

    def infer_when_generic_row() -> str | None:
        if not text_blob:
            return None
        if "cream of" not in text_blob and re.search(r"\bcream\b", text_blob):
            return "cream"
        if re.search(r"\bointment\b", text_blob):
            return "ointment"
        if re.search(r"\bgel\b", text_blob) and not re.search(r"\bangel\b", text_blob):
            return "gel"
        if re.search(r"\bsyrup\b|\belixir\b", text_blob):
            return "syrup"
        if re.search(r"\bdrops?\b", text_blob) and not re.search(r"\bointment\b", text_blob):
            return "drop"
        if re.search(r"\binjection\b|\binfusion\b|\bampoule\b|\bvial\b", text_blob):
            return "injection"
        if re.search(r"\binhaler\b", text_blob):
            return "inhaler"
        # Tube is common for topical creams/ointments; avoid matching toothpaste etc. by requiring a topical hint.
        if re.search(r"\btube\b", text_blob) and re.search(
            r"\b(ointment|cream|gel|topical)\b", text_blob
        ):
            if re.search(r"\bointment\b", text_blob):
                return "ointment"
            if re.search(r"\bcream\b", text_blob):
                return "cream"
            if re.search(r"\bgel\b", text_blob):
                return "gel"
            return "ointment"
        if re.search(r"\btablet\b|\btab\b", text_blob):
            return "tablet"
        if re.search(r"\bcapsule\b|\bcap\b", text_blob):
            return "tablet"
        return None

    if raw not in ("tablet", "other", ""):
        return raw

    inferred = infer_when_generic_row()
    if inferred is not None:
        return inferred
    return raw


def route_for_type(drug_type: str) -> tuple[str, str]:
    return ROUTE_MAP.get(drug_type, DEFAULT_ROUTE)


def instruction_texts_for_type(drug_type: str) -> list[str]:
    return list(INSTRUCTION_MAP.get(drug_type, []))
