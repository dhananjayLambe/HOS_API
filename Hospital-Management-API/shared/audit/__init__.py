"""Shared audit platform for Clinical and Business audit frameworks."""

from shared.audit.envelope import (
    META_KEY,
    PAYLOAD_KEY,
    SCHEMA_VERSION,
    build_metadata_envelope,
    build_new_value_envelope,
)
from shared.audit.exceptions import (
    AuditBuilderError,
    AuditError,
    AuditImmutabilityError,
    AuditRepositoryError,
    AuditSerializationError,
    AuditValidationError,
)
from shared.audit.sanitization import sanitize_audit_payload, sanitize_audit_snapshot

__all__ = [
    "AuditBuilderError",
    "AuditError",
    "AuditImmutabilityError",
    "AuditRepositoryError",
    "AuditSerializationError",
    "AuditValidationError",
    "META_KEY",
    "PAYLOAD_KEY",
    "SCHEMA_VERSION",
    "build_metadata_envelope",
    "build_new_value_envelope",
    "sanitize_audit_payload",
    "sanitize_audit_snapshot",
]
