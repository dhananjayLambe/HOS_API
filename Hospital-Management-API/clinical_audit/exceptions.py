"""Exceptions for the Clinical Audit Framework."""


class ClinicalAuditError(Exception):
    """Base error for Clinical Audit operations."""


class ClinicalAuditImmutabilityError(ClinicalAuditError):
    """Raised when an attempt is made to modify or delete an audit record."""


class AuditValidationError(ClinicalAuditError):
    """Raised when audit input fails validation."""


class AuditBuilderError(ClinicalAuditError):
    """Raised when audit record construction fails."""


class AuditRepositoryError(ClinicalAuditError):
    """Raised when audit persistence fails."""


class AuditSerializationError(ClinicalAuditError):
    """Raised when payload or snapshot cannot be serialized."""
