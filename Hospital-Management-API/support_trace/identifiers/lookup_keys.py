"""Canonical identifier field registry."""

from __future__ import annotations

import re
from typing import Any

IDENTIFIER_FIELDS: tuple[str, ...] = (
    "patient_account_id",
    "patient_profile_id",
    "consultation_id",
    "encounter_id",
    "recommendation_id",
    "booking_id",
    "routing_id",
    "report_id",
    "prescription_id",
    "order_id",
    "payment_id",
    "invoice_id",
    "laboratory_id",
    "branch_id",
    "provider_reference",
    "whatsapp_message_id",
    "phone_number",
)

_LOG_CONTEXT_IDENTIFIER_MAP: dict[str, str] = {
    "patient_account_id": "patient_account_id",
    "patient_profile_id": "patient_profile_id",
    "consultation_id": "consultation_id",
    "encounter_id": "encounter_id",
    "recommendation_id": "recommendation_id",
    "booking_id": "booking_id",
    "order_id": "order_id",
    "laboratory_id": "laboratory_id",
    "report_id": "report_id",
    "whatsapp_message_id": "whatsapp_message_id",
}


def _normalize_field(field: str, value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if field == "phone_number":
        return normalize_phone(text)
    if field in {
        "patient_account_id",
        "patient_profile_id",
        "consultation_id",
        "encounter_id",
        "recommendation_id",
        "booking_id",
        "routing_id",
        "report_id",
        "prescription_id",
        "order_id",
        "payment_id",
        "invoice_id",
        "laboratory_id",
        "branch_id",
    }:
        from shared.audit.base_validator import is_valid_uuid

        if is_valid_uuid(text):
            return normalize_uuid(text)
        return text
    if field == "provider_reference":
        return normalize_provider_reference(text)
    return text


def normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    digits = re.sub(r"\D", "", str(value).strip())
    return digits or None


def normalize_uuid(value: str | None) -> str | None:
    if not value:
        return None
    text = str(value).strip().lower()
    return text or None


def normalize_provider_reference(value: str | None) -> str | None:
    if not value:
        return None
    text = str(value).strip()
    return text or None


def build_search_vector(identifiers: dict[str, str]) -> dict[str, list[str]]:
    """Reserved tokens for future OpenSearch migration."""
    tokens: dict[str, list[str]] = {}
    for field, value in identifiers.items():
        if field == "phone_number":
            tokens[field] = [value]
        else:
            tokens[field] = [value.lower()]
    return tokens


def merge_identifiers(
    *,
    explicit: dict[str, str] | None,
    context_values: dict[str, str | None],
) -> dict[str, str]:
    merged: dict[str, str] = {}
    for field in IDENTIFIER_FIELDS:
        raw = None
        if explicit and field in explicit:
            raw = explicit[field]
        elif field in context_values and context_values[field]:
            raw = context_values[field]
        if raw is not None:
            normalized = _normalize_field(field, raw)
            if normalized:
                merged[field] = normalized
    return merged


def count_identifiers(identifiers: dict[str, str]) -> int:
    return sum(1 for field in IDENTIFIER_FIELDS if identifiers.get(field))


def identifiers_from_trace(trace: Any) -> dict[str, str]:
    if trace is None:
        return {}
    result: dict[str, str] = {}
    for field in IDENTIFIER_FIELDS:
        value = getattr(trace, field, None)
        if value:
            result[field] = str(value)
    return result


def accumulative_merge(
    existing: Any | None,
    new_ids: dict[str, str],
) -> dict[str, str]:
    """Fill empty fields from new_ids; never blank existing values."""
    merged = identifiers_from_trace(existing)
    for field, value in new_ids.items():
        if field not in IDENTIFIER_FIELDS or not value:
            continue
        if not merged.get(field):
            merged[field] = value
    return merged
