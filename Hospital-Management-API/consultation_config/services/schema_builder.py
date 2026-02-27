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
    else:
        # For now, all other sections return a basic, extensible schema.
        schema = _build_basic_section_schema(section)

    cache.set(cache_key, schema, timeout=SCHEMA_CACHE_TTL_SECONDS)
    return schema

