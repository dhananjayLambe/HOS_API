"""Shared exceptions for audit frameworks."""


class AuditError(Exception):
    """Base error for audit operations."""


class AuditImmutabilityError(AuditError):
    """Raised when an attempt is made to modify or delete an audit record."""


class AuditValidationError(AuditError):
    """Raised when audit input fails validation."""


class AuditBuilderError(AuditError):
    """Raised when audit record construction fails."""


class AuditRepositoryError(AuditError):
    """Raised when audit persistence fails."""


class AuditSerializationError(AuditError):
    """Raised when payload or snapshot cannot be serialized."""
