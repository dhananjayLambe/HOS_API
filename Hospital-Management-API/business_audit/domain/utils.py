"""Business Audit domain utilities."""

from __future__ import annotations

from business_audit.constants import MAX_PAYLOAD_BYTES, MAX_REMARKS_LENGTH, MAX_SUMMARY_LENGTH
from business_audit.enums import BusinessAuditAction
from shared.audit.base_validator import (
    is_valid_uuid,
    normalize_enum_value,
    validate_optional_json_dict,
    validate_remarks,
    validate_required_string,
    validate_summary_length,
)
from shared.audit.sanitization import sanitize_audit_payload

__all__ = [
    "audit_event_label",
    "is_valid_uuid",
    "normalize_enum_value",
    "sanitize_audit_payload",
    "validate_optional_json_dict",
    "validate_remarks",
    "validate_required_string",
    "validate_summary_length",
]


def audit_event_label(action: BusinessAuditAction) -> str:
    return action.label


def validate_business_payload(payload: dict | None) -> dict | None:
    if payload is None:
        return None
    return sanitize_audit_payload(payload, max_bytes=MAX_PAYLOAD_BYTES)


def validate_business_remarks(remarks: str | None) -> str | None:
    return validate_remarks(remarks, max_length=MAX_REMARKS_LENGTH)


def validate_business_summary(summary: str) -> str:
    return validate_summary_length(summary, max_length=MAX_SUMMARY_LENGTH)
