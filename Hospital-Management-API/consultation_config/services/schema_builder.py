import json
import os
from typing import Any, Dict, List

from django.conf import settings
from django.core.cache import cache


SCHEMA_CACHE_TTL_SECONDS = 60 * 60  # 1 hour
SCHEMA_CACHE_KEY_PATTERN = "consult_schema:{version}:{specialty}:{section}"


def _load_json(relative_path: str) -> Dict[str, Any]:
    """
    Load a JSON configuration file from the consultations_core templates_metadata tree.
    """
    base_dir = settings.BASE_DIR
    path = os.path.join(
        base_dir,
        "consultations_core",
        "templates_metadata",
        *relative_path.split("/"),
    )

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _get_specialty_config() -> Dict[str, Any]:
    return _load_json("consultation/specialty_config.json")


def _get_sections_config() -> Dict[str, Any]:
    return _load_json("consultation/sections.json")


def _get_symptoms_master() -> Dict[str, Any]:
    return _load_json("consultation/symptoms/symptoms_master.json")


def _get_symptom_details() -> Dict[str, Any]:
    return _load_json("consultation/symptoms/symptom_details.json")


def _get_specialty_symptoms() -> Dict[str, Any]:
    return _load_json("consultation/symptoms/specialty_symptoms.json")


def _get_findings_master() -> Dict[str, Any]:
    return _load_json("consultation/findings/findings_master.json")


def _get_finding_details() -> Dict[str, Any]:
    return _load_json("consultation/findings/finding_details.json")


def _get_specialty_findings() -> Dict[str, Any]:
    return _load_json("consultation/findings/specialty_findings.json")


def _get_diagnosis_master() -> Dict[str, Any]:
    return _load_json("consultation/diagnosis/diagnosis_master.json")


def _get_specialty_diagnosis() -> Dict[str, Any]:
    return _load_json("consultation/diagnosis/specialty_diagnosis.json")


def _get_instructions_master() -> Dict[str, Any]:
    return _load_json("consultation/instructions/instructions_master.json")


def _get_specialty_instructions() -> Dict[str, Any]:
    return _load_json("consultation/instructions/specialty_instructions.json")


def _get_instruction_details() -> Dict[str, Any]:
    return _load_json("consultation/instructions/instruction_details.json")


def _build_instructions_schema(specialty: str) -> Dict[str, Any]:
    """
    Build dynamic schema for the Instructions section from JSON metadata.
    Returns categories and templates (items) with input_schema for the right panel.
    """
    specialty_instructions = _get_specialty_instructions()
    master = _get_instructions_master()
    details = _get_instruction_details()

    # specialty_instructions: { "physician": ["adequate_rest", ...], "gynecology": [...], ... }
    allowed_keys: List[str] = []
    raw = specialty_instructions.get(specialty)
    if isinstance(raw, list):
        allowed_keys = raw

    items_master = master.get("items", {})
    category_order: Dict[str, int] = {}
    categories_list: List[Dict[str, Any]] = []
    items: List[Dict[str, Any]] = []

    for idx, key in enumerate(allowed_keys):
        entry = items_master.get(key)
        if not entry:
            continue
        cat_code = entry.get("category", "general_advice")
        if cat_code not in category_order:
            category_order[cat_code] = len(categories_list)
            categories_list.append({
                "id": cat_code,
                "code": cat_code,
                "name": cat_code.replace("_", " ").title(),
                "display_order": len(categories_list),
            })
        detail_entry = details.get(key, {})
        fields = detail_entry.get("fields", [])
        input_schema = {"fields": fields} if fields else None
        items.append({
            "key": key,
            "id": key,
            "label": entry.get("label", key),
            "category_code": cat_code,
            "requires_input": entry.get("requires_input", False),
            "input_schema": input_schema,
            "display_order": idx,
        })

    meta = master.get("meta", {})

    return {
        "section": "instructions",
        "ui_type": "selectable_list_with_detail_panel",
        "meta": meta,
        "categories": categories_list,
        "items": items,
    }


def _build_symptoms_schema(specialty: str) -> Dict[str, Any]:
    specialty_symptoms = _get_specialty_symptoms()
    symptoms_master = _get_symptoms_master()
    symptom_details = _get_symptom_details()

    allowed_keys: List[str] = specialty_symptoms.get(specialty, [])
    items: List[Dict[str, Any]] = []

    master_items = symptoms_master.get("items", {})

    for key in allowed_keys:
        master_entry = master_items.get(key)
        if not master_entry:
            # If a key is configured for the specialty but not present in master,
            # it is silently skipped to avoid breaking the UI.
            continue

        details_entry = symptom_details.get(key, {})
        fields = details_entry.get("fields", [])

        items.append(
            {
                "key": key,
                "display_name": master_entry.get("display_name"),
                "icd10_code": master_entry.get("icd10_code"),
                "category": master_entry.get("category"),
                "clinical_term": master_entry.get("clinical_term"),
                "synonyms": master_entry.get("synonyms", []),
                "search_keywords": master_entry.get("search_keywords", []),
                # Field schema is returned largely as-is so the frontend
                # can drive rendering without hardcoding medical logic.
                "fields": fields,
            }
        )

    # Include meta rules from symptom_details to help the UI
    meta = _get_symptom_details().get("meta", {})

    return {
        "section": "symptoms",
        "ui_type": "selectable_list_with_detail_panel",
        "meta": meta,
        "items": items,
    }


def _build_findings_schema(specialty: str) -> Dict[str, Any]:
    """
    Build dynamic schema for the Findings section.

    Uses:
    - consultation/findings/specialty_findings.json for allowed keys
    - consultation/findings/findings_master.json for labels + ICD10 + category
    - consultation/findings/finding_details.json for field definitions
    """
    specialty_findings = _get_specialty_findings()
    findings_master = _get_findings_master()
    finding_details = _get_finding_details()

    allowed_keys: List[str] = specialty_findings.get(specialty, [])
    items: List[Dict[str, Any]] = []

    master_items = findings_master.get("items", {})

    for key in allowed_keys:
        master_entry = master_items.get(key)
        if not master_entry:
            # Skip unknown keys rather than breaking the UI.
            continue

        details_entry = finding_details.get(key, {})
        fields = details_entry.get("fields", [])

        items.append(
            {
                "key": key,
                "display_name": master_entry.get("label"),
                "icd10_code": master_entry.get("icd10_code"),
                "category": master_entry.get("category"),
                "clinical_term": master_entry.get("clinical_term"),
                "severity_supported": master_entry.get("severity_supported"),
                "synonyms": master_entry.get("synonyms", []),
                "search_keywords": master_entry.get("search_keywords", []),
                "fields": fields,
            }
        )

    meta = finding_details.get("meta", {})

    return {
        "section": "findings",
        "ui_type": "selectable_list_with_detail_panel",
        "meta": meta,
        "items": items,
    }


def _build_diagnosis_schema(specialty: str) -> Dict[str, Any]:
    """
    Build dynamic schema for the Diagnosis section.

    Uses:
    - consultation/diagnosis/specialty_diagnosis.json for allowed keys
    - consultation/diagnosis/diagnosis_master.json for labels + ICD10 + metadata
    """
    specialty_diagnosis = _get_specialty_diagnosis()
    diagnosis_master = _get_diagnosis_master()

    allowed_keys: List[str] = specialty_diagnosis.get(specialty, [])
    items: List[Dict[str, Any]] = []

    master_items = diagnosis_master.get("items", {})

    for key in allowed_keys:
        master_entry = master_items.get(key)
        if not master_entry:
            continue

        items.append(
            {
                "key": key,
                "display_name": master_entry.get("label"),
                "icd10_code": master_entry.get("icd10_code"),
                "category": master_entry.get("category"),
                "clinical_term": master_entry.get("clinical_term"),
                "chronic": master_entry.get("chronic", False),
                "diagnosis_type": master_entry.get("diagnosis_type"),
                "severity_supported": master_entry.get("severity_supported"),
                "parent_code": master_entry.get("parent_code"),
                "is_primary_allowed": master_entry.get("is_primary_allowed", True),
                "synonyms": master_entry.get("synonyms", []),
                "search_keywords": master_entry.get("search_keywords", []),
            }
        )

    meta = diagnosis_master.get("meta", {})

    return {
        "section": "diagnosis",
        "ui_type": "grouped_list_with_detail_panel",
        "meta": meta,
        "items": items,
    }


def _get_metadata_version() -> str:
    """
    Returns a string version derived from the shared metadata _version.json file.

    Changing metadata_version there will automatically invalidate cached schemas
    by moving them to a new cache key namespace.
    """
    try:
        data = _load_json("_version.json")
        version = data.get("metadata_version")
        if version is None:
            return "v1"
        return f"v{version}"
    except FileNotFoundError:
        return "v1"


def _build_basic_section_schema(section: str) -> Dict[str, Any]:
    """
    Placeholder for other sections (diagnosis, medicines, investigations, instructions, procedures).
    Returns a minimal schema that can be extended later without frontend changes.
    """
    return {
        "section": section,
        "ui_type": "basic_form",
        "items": [],
    }


def get_render_schema(specialty: str, section: str) -> Dict[str, Any]:
    """
    Public entrypoint used by the API.

    - Validates that the specialty exists.
    - Validates that the section is allowed for the specialty.
    - Builds a section-specific schema.
    - Caches the schema per (specialty, section) in Redis.
    """
    specialty = (specialty or "").strip()
    section = (section or "").strip()

    if not specialty:
        raise ValueError("specialty is required")
    if not section:
        raise ValueError("section is required")

    version = _get_metadata_version()
    cache_key = SCHEMA_CACHE_KEY_PATTERN.format(
        version=version,
        specialty=specialty,
        section=section,
    )
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    specialty_config = _get_specialty_config()
    sections_config = _get_sections_config()

    if specialty not in specialty_config:
        raise LookupError(f"Unknown specialty: {specialty}")

    allowed_sections = specialty_config[specialty].get("sections", [])
    global_sections = sections_config.get("sections", [])

    if section not in global_sections:
        raise LookupError(f"Unknown section: {section}")

    if section not in allowed_sections:
        raise PermissionError(
            f"Section '{section}' not allowed for specialty '{specialty}'."
        )

    if section == "symptoms":
        schema = _build_symptoms_schema(specialty)
    elif section == "findings":
        schema = _build_findings_schema(specialty)
    elif section == "diagnosis":
        schema = _build_diagnosis_schema(specialty)
    elif section == "instructions":
        schema = _build_instructions_schema(specialty)
    else:
        # For now, all other sections return a basic, extensible schema.
        schema = _build_basic_section_schema(section)

    cache.set(cache_key, schema, timeout=SCHEMA_CACHE_TTL_SECONDS)
    return schema


def clear_consultation_schema_cache() -> int:
    """
    Delete all consultation schema cache entries (consult_schema:*).
    Used after template JSON changes so the next API request loads fresh data.
    Returns the number of keys deleted.
    """
    specialty_config = _get_specialty_config()
    sections_config = _get_sections_config()
    version = _get_metadata_version()
    global_sections = sections_config.get("sections", [])
    deleted = 0
    for specialty in specialty_config:
        if specialty.startswith("_") or specialty == "meta":
            continue
        entry = specialty_config.get(specialty)
        if not isinstance(entry, dict):
            continue
        allowed = entry.get("sections", []) or global_sections
        for section in allowed:
            if section not in global_sections:
                continue
            cache_key = SCHEMA_CACHE_KEY_PATTERN.format(
                version=version,
                specialty=specialty,
                section=section,
            )
            try:
                cache.delete(cache_key)
                deleted += 1
            except Exception:
                pass
    return deleted

