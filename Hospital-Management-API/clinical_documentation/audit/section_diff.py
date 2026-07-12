"""Allergy section diff helpers for clinical documentation audit."""

from __future__ import annotations

from typing import Any


def _extract_allergen_name(entry: dict[str, Any]) -> str:
    allergen = entry.get("allergen")
    if isinstance(allergen, dict):
        return str(allergen.get("allergen_name") or allergen.get("name") or "").strip()
    return str(entry.get("allergen_name") or entry.get("allergen") or "").strip()


def _extract_field_value(entry: dict[str, Any], key: str) -> Any:
    raw = entry.get(key)
    if isinstance(raw, dict):
        return raw.get(key) or raw.get("value") or raw.get("label")
    return raw


def _normalize_allergy_entry(entry: dict[str, Any]) -> dict[str, Any]:
    reaction = _extract_field_value(entry, "reaction")
    if isinstance(reaction, list):
        reaction_value = reaction
    elif reaction is not None:
        reaction_value = str(reaction)
    else:
        reaction_value = None
    severity = _extract_field_value(entry, "severity")
    return {
        "allergen": _extract_allergen_name(entry),
        "reaction": reaction_value,
        "severity": str(severity).strip() if severity is not None else None,
    }


def _allergy_entries_from_data(data: dict[str, Any] | list | None) -> list[dict[str, Any]]:
    if data is None:
        return []
    if isinstance(data, list):
        candidates = data
    elif isinstance(data, dict):
        candidates = (
            data.get("entries")
            or data.get("items")
            or data.get("allergies")
            or []
        )
        if not candidates and any(
            key in data for key in ("allergen", "allergen_name", "reaction", "severity")
        ):
            candidates = [data]
    else:
        return []
    normalized: list[dict[str, Any]] = []
    for item in candidates:
        if isinstance(item, dict):
            normalized.append(_normalize_allergy_entry(item))
    return [entry for entry in normalized if entry.get("allergen")]


def _allergy_map(entries: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for entry in entries:
        key = str(entry.get("allergen", "")).strip().lower()
        if key:
            result[key] = entry
    return result


def diff_allergy_section(
    prior_data: dict[str, Any] | list | None,
    new_data: dict[str, Any] | list | None,
) -> dict[str, list]:
    """Return added and updated allergy entries between two section payloads."""
    prior_map = _allergy_map(_allergy_entries_from_data(prior_data))
    new_map = _allergy_map(_allergy_entries_from_data(new_data))

    added: list[dict[str, Any]] = []
    updated: list[dict[str, Any]] = []

    for key, after in new_map.items():
        before = prior_map.get(key)
        if before is None:
            added.append(after)
            continue
        changed_fields = [
            field
            for field in ("allergen", "reaction", "severity")
            if before.get(field) != after.get(field)
        ]
        if changed_fields:
            updated.append(
                {
                    "key": key,
                    "before": before,
                    "after": after,
                    "changed_fields": changed_fields,
                }
            )

    return {"added": added, "updated": updated}


def vitals_payloads_equal(
    prior_data: dict[str, Any] | None,
    new_data: dict[str, Any] | None,
) -> bool:
    """Return True when normalized vitals payloads are equivalent."""
    from clinical_documentation.audit.payload_builder import (
        ClinicalDocumentationPayloadBuilder,
    )

    prior = ClinicalDocumentationPayloadBuilder.build_vital_signs_recorded(
        vitals_data=prior_data or {}
    )
    new = ClinicalDocumentationPayloadBuilder.build_vital_signs_recorded(
        vitals_data=new_data or {}
    )
    return prior == new
