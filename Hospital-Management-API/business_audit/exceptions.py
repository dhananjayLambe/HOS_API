"""Exceptions for the Business Audit Framework."""

from shared.audit.exceptions import AuditError as SharedAuditError
from shared.audit.exceptions import (
    AuditBuilderError as SharedAuditBuilderError,
    AuditImmutabilityError as SharedAuditImmutabilityError,
    AuditRepositoryError as SharedAuditRepositoryError,
    AuditSerializationError as SharedAuditSerializationError,
    AuditValidationError as SharedAuditValidationError,
)


class BusinessAuditError(SharedAuditError):
    """Base error for Business Audit operations."""


class BusinessAuditImmutabilityError(BusinessAuditError, SharedAuditImmutabilityError):
    """Raised when an attempt is made to modify or delete an audit record."""


class AuditValidationError(BusinessAuditError, SharedAuditValidationError):
    """Raised when audit input fails validation."""


class AuditBuilderError(BusinessAuditError, SharedAuditBuilderError):
    """Raised when audit record construction fails."""


class AuditRepositoryError(BusinessAuditError, SharedAuditRepositoryError):
    """Raised when audit persistence fails."""


class AuditSerializationError(BusinessAuditError, SharedAuditSerializationError):
    """Raised when payload or snapshot cannot be serialized."""
