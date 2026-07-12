"""Shared helpers for Clinical Audit service layers."""

from __future__ import annotations

import json
import re
import socket
from datetime import datetime
from typing import Any
from uuid import UUID

from django.conf import settings
from django.utils import timezone

from clinical_audit.constants import (
    MAX_PAYLOAD_BYTES,
    MAX_REMARKS_LENGTH,
    MAX_SNAPSHOT_BYTES,
    MAX_SUMMARY_LENGTH,
    META_APPLICATION_VERSION,
    META_HOSTNAME,
    META_KEY,
    META_OCCURRED_AT,
    META_ORGANIZATION_ID,
    META_REQUEST_ID,
    META_SERVICE_NAME,
    META_TIMEZONE,
    PAYLOAD_KEY,
)
from clinical_audit.enums import AuditAction
from clinical_audit.exceptions import AuditSerializationError

FORBIDDEN_PAYLOAD_KEYS = frozenset(
    {
        "password",
        "passwd",
        "secret",
        "token",
        "access_token",
        "refresh_token",
        "jwt",
        "otp",
        "authorization",
        "api_key",
        "session",
        "cookie",
        "attachment",
        "attachment_data",
        "file_content",
        "pdf",
        "pdf_data",
        "image_data",
        "dicom",
        "ecg_data",
        "binary",
        "base64_data",
    }
)

FORBIDDEN_PAYLOAD_PATTERNS = (
    re.compile(r"^data:(application/pdf|image/|application/dicom)", re.I),
    re.compile(r"^[A-Za-z0-9+/]{500,}={0,2}$"),  # large base64 blobs
)


def audit_event_label(action: AuditAction) -> str:
    """Canonical display label from AuditAction — single source of truth."""
    return action.label


def is_valid_uuid(value: str) -> bool:
    try:
        UUID(str(value))
    except (TypeError, ValueError, AttributeError):
        return False
    return True


def derive_module_from_action(action: str) -> str:
    if "." in action:
        return action.split(".", 1)[0]
    return action


def assert_json_serializable(value: Any, *, field_name: str) -> None:
    try:
        json.dumps(value)
    except (TypeError, ValueError) as exc:
        raise AuditSerializationError(
            f"{field_name} must be JSON serializable."
        ) from exc


def json_byte_size(value: Any) -> int:
    return len(json.dumps(value, default=str).encode("utf-8"))


def truncate_if_needed(value: str, max_length: int) -> str:
    if len(value) <= max_length:
        return value
    return value[: max_length - 3] + "..."


def normalize_enum_value(value: Any, enum_cls: type) -> str:
    if isinstance(value, enum_cls):
        return value.value
    normalized = str(value).strip()
    valid = {choice.value for choice in enum_cls}
    if normalized not in valid:
        raise ValueError(f"Invalid {enum_cls.__name__}: {normalized}")
    return normalized


def build_metadata_envelope(
    *,
    organization_id: str,
    request_id: str | None = None,
    occurred_at: datetime | None = None,
    service_name: str | None = None,
) -> dict[str, Any]:
    meta: dict[str, Any] = {
        META_ORGANIZATION_ID: organization_id,
    }
    if request_id:
        meta[META_REQUEST_ID] = request_id
    if occurred_at is not None:
        meta[META_OCCURRED_AT] = occurred_at.isoformat()
    else:
        meta[META_OCCURRED_AT] = timezone.now().isoformat()
    meta[META_TIMEZONE] = str(timezone.get_current_timezone())
    meta[META_APPLICATION_VERSION] = getattr(
        settings, "APPLICATION_VERSION", None
    ) or "0.0.0"
    if service_name:
        meta[META_SERVICE_NAME] = service_name
    try:
        meta[META_HOSTNAME] = socket.gethostname()
    except OSError:
        meta[META_HOSTNAME] = None
    return meta


def build_new_value_envelope(
    *,
    organization_id: str,
    payload: dict[str, Any] | None,
    request_id: str | None = None,
    occurred_at: datetime | None = None,
    service_name: str | None = None,
) -> dict[str, Any]:
    envelope: dict[str, Any] = {
        META_KEY: build_metadata_envelope(
            organization_id=organization_id,
            request_id=request_id,
            occurred_at=occurred_at,
            service_name=service_name,
        ),
    }
    if payload is not None:
        envelope[PAYLOAD_KEY] = payload
    return envelope


def validate_summary_length(summary: str) -> str:
    summary = summary.strip()
    if not summary:
        raise ValueError("event summary is required.")
    if len(summary) > MAX_SUMMARY_LENGTH:
        raise ValueError(
            f"event summary exceeds maximum length of {MAX_SUMMARY_LENGTH}."
        )
    return summary


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


def validate_remarks(remarks: str | None) -> str | None:
    if remarks is None:
        return None
    remarks = remarks.strip()
    if len(remarks) > MAX_REMARKS_LENGTH:
        return truncate_if_needed(remarks, MAX_REMARKS_LENGTH)
    return remarks or None


def _sanitize_value(key: str, value: Any) -> Any:
    key_lower = key.lower()
    if key_lower in FORBIDDEN_PAYLOAD_KEYS:
        raise AuditSerializationError(f"Forbidden key in audit payload: {key}")
    if isinstance(value, dict):
        return sanitize_audit_payload(value)
    if isinstance(value, list):
        return [sanitize_audit_payload(item) if isinstance(item, dict) else item for item in value]
    if isinstance(value, str):
        for pattern in FORBIDDEN_PAYLOAD_PATTERNS:
            if pattern.search(value):
                raise AuditSerializationError(
                    f"Forbidden content pattern in audit payload key: {key}"
                )
    return value


def sanitize_audit_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Strip forbidden PHI/credentials/binary content from audit payloads."""
    if not isinstance(payload, dict):
        raise AuditSerializationError("payload must be a dict.")
    sanitized: dict[str, Any] = {}
    for key, value in payload.items():
        sanitized[key] = _sanitize_value(key, value)
    assert_json_serializable(sanitized, field_name="payload")
    if json_byte_size(sanitized) > MAX_PAYLOAD_BYTES:
        raise AuditSerializationError(
            f"payload exceeds maximum size of {MAX_PAYLOAD_BYTES} bytes."
        )
    return sanitized


def sanitize_audit_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Sanitize snapshot dict with snapshot size limit."""
    sanitized = sanitize_audit_payload(snapshot)
    if json_byte_size(sanitized) > MAX_SNAPSHOT_BYTES:
        raise AuditSerializationError(
            f"snapshot exceeds maximum size of {MAX_SNAPSHOT_BYTES} bytes."
        )
    return sanitized
