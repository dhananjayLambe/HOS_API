"""Payload sanitization shared by Clinical and Business audit."""

from __future__ import annotations

import json
import re
from typing import Any

from shared.audit.exceptions import AuditSerializationError

DEFAULT_MAX_PAYLOAD_BYTES = 64 * 1024
DEFAULT_MAX_SNAPSHOT_BYTES = 64 * 1024

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
    re.compile(r"^[A-Za-z0-9+/]{500,}={0,2}$"),
)


def assert_json_serializable(value: Any, *, field_name: str) -> None:
    try:
        json.dumps(value)
    except (TypeError, ValueError) as exc:
        raise AuditSerializationError(
            f"{field_name} must be JSON serializable."
        ) from exc


def json_byte_size(value: Any) -> int:
    return len(json.dumps(value, default=str).encode("utf-8"))


def _sanitize_value(key: str, value: Any, *, max_payload_bytes: int) -> Any:
    key_lower = key.lower()
    if key_lower in FORBIDDEN_PAYLOAD_KEYS:
        raise AuditSerializationError(f"Forbidden key in audit payload: {key}")
    if isinstance(value, dict):
        return sanitize_audit_payload(value, max_bytes=max_payload_bytes)
    if isinstance(value, list):
        return [
            sanitize_audit_payload(item, max_bytes=max_payload_bytes)
            if isinstance(item, dict)
            else item
            for item in value
        ]
    if isinstance(value, str):
        for pattern in FORBIDDEN_PAYLOAD_PATTERNS:
            if pattern.search(value):
                raise AuditSerializationError(
                    f"Forbidden content pattern in audit payload key: {key}"
                )
    return value


def sanitize_audit_payload(
    payload: dict[str, Any],
    *,
    max_bytes: int = DEFAULT_MAX_PAYLOAD_BYTES,
) -> dict[str, Any]:
    """Strip forbidden credentials/binary content from audit payloads."""
    if not isinstance(payload, dict):
        raise AuditSerializationError("payload must be a dict.")
    sanitized: dict[str, Any] = {}
    for key, value in payload.items():
        sanitized[key] = _sanitize_value(key, value, max_payload_bytes=max_bytes)
    assert_json_serializable(sanitized, field_name="payload")
    if json_byte_size(sanitized) > max_bytes:
        raise AuditSerializationError(
            f"payload exceeds maximum size of {max_bytes} bytes."
        )
    return sanitized


def sanitize_audit_snapshot(
    snapshot: dict[str, Any],
    *,
    max_bytes: int = DEFAULT_MAX_SNAPSHOT_BYTES,
) -> dict[str, Any]:
    """Sanitize snapshot dict with snapshot size limit."""
    sanitized = sanitize_audit_payload(snapshot, max_bytes=max_bytes)
    if json_byte_size(sanitized) > max_bytes:
        raise AuditSerializationError(
            f"snapshot exceeds maximum size of {max_bytes} bytes."
        )
    return sanitized
