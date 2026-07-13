"""Shared validation helpers for audit frameworks."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from shared.audit.exceptions import AuditSerializationError
from shared.audit.sanitization import assert_json_serializable, json_byte_size


def is_valid_uuid(value: str) -> bool:
    try:
        UUID(str(value))
    except (TypeError, ValueError, AttributeError):
        return False
    return True


def normalize_enum_value(value: Any, enum_cls: type) -> str:
    if isinstance(value, enum_cls):
        return value.value
    normalized = str(value).strip()
    valid = {choice.value for choice in enum_cls}
    if normalized not in valid:
        raise ValueError(f"Invalid {enum_cls.__name__}: {normalized}")
    return normalized


def validate_required_string(value: Any, *, field_name: str) -> str:
    if value is None or not str(value).strip():
        raise ValueError(f"{field_name} is required.")
    return str(value).strip()


def validate_optional_json_dict(
    value: Any | None,
    *,
    field_name: str,
    max_bytes: int,
) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be a dict.")
    assert_json_serializable(value, field_name=field_name)
    if json_byte_size(value) > max_bytes:
        raise ValueError(f"{field_name} exceeds maximum size of {max_bytes} bytes.")
    return value


def validate_remarks(remarks: str | None, *, max_length: int) -> str | None:
    if remarks is None:
        return None
    remarks = remarks.strip()
    if len(remarks) > max_length:
        return remarks[: max_length - 3] + "..."
    return remarks or None


def validate_summary_length(summary: str, *, max_length: int) -> str:
    summary = summary.strip()
    if not summary:
        raise ValueError("event summary is required.")
    if len(summary) > max_length:
        raise ValueError(f"event summary exceeds maximum length of {max_length}.")
    return summary


def derive_module_from_action(action: str) -> str:
    if "." in action:
        return action.split(".", 1)[0]
    return action
