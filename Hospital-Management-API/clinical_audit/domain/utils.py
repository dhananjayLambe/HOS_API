"""Shared helpers for Clinical Audit service layers."""

from __future__ import annotations

from typing import Any

from shared.audit.base_validator import (
    derive_module_from_action,
    is_valid_uuid,
    normalize_enum_value,
    validate_optional_json_dict as _shared_validate_optional_json_dict,
    validate_remarks as _shared_validate_remarks,
    validate_summary_length as _shared_validate_summary_length,
)
from shared.audit.envelope import build_metadata_envelope, build_new_value_envelope
from shared.audit.exceptions import AuditSerializationError as SharedAuditSerializationError
from shared.audit.sanitization import (
    FORBIDDEN_PAYLOAD_KEYS,
    FORBIDDEN_PAYLOAD_PATTERNS,
    assert_json_serializable,
    json_byte_size,
    sanitize_audit_payload as _shared_sanitize_audit_payload,
    sanitize_audit_snapshot as _shared_sanitize_audit_snapshot,
)

from clinical_audit.constants import (
    MAX_PAYLOAD_BYTES,
    MAX_REMARKS_LENGTH,
    MAX_SNAPSHOT_BYTES,
    MAX_SUMMARY_LENGTH,
)
from clinical_audit.enums import AuditAction
from clinical_audit.exceptions import AuditSerializationError

__all__ = [
    "FORBIDDEN_PAYLOAD_KEYS",
    "FORBIDDEN_PAYLOAD_PATTERNS",
    "AuditSerializationError",
    "assert_json_serializable",
    "audit_event_label",
    "build_metadata_envelope",
    "build_new_value_envelope",
    "derive_module_from_action",
    "is_valid_uuid",
    "json_byte_size",
    "normalize_enum_value",
    "sanitize_audit_payload",
    "sanitize_audit_snapshot",
    "truncate_if_needed",
    "validate_optional_json_dict",
    "validate_remarks",
    "validate_summary_length",
]


def audit_event_label(action: AuditAction) -> str:
    """Canonical display label from AuditAction — single source of truth."""
    return action.label


def truncate_if_needed(value: str, max_length: int) -> str:
    if len(value) <= max_length:
        return value
    return value[: max_length - 3] + "..."


def validate_summary_length(summary: str) -> str:
    return _shared_validate_summary_length(summary, max_length=MAX_SUMMARY_LENGTH)


def validate_remarks(remarks: str | None) -> str | None:
    return _shared_validate_remarks(remarks, max_length=MAX_REMARKS_LENGTH)


def validate_optional_json_dict(
    value: Any | None,
    *,
    field_name: str,
    max_bytes: int = MAX_PAYLOAD_BYTES,
) -> dict[str, Any] | None:
    try:
        return _shared_validate_optional_json_dict(
            value, field_name=field_name, max_bytes=max_bytes
        )
    except SharedAuditSerializationError as exc:
        raise AuditSerializationError(str(exc)) from exc


def sanitize_audit_payload(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return _shared_sanitize_audit_payload(payload, max_bytes=MAX_PAYLOAD_BYTES)
    except SharedAuditSerializationError as exc:
        raise AuditSerializationError(str(exc)) from exc


def sanitize_audit_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    try:
        return _shared_sanitize_audit_snapshot(snapshot, max_bytes=MAX_SNAPSHOT_BYTES)
    except SharedAuditSerializationError as exc:
        raise AuditSerializationError(str(exc)) from exc
