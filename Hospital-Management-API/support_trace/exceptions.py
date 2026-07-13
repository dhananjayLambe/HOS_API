"""Exceptions for the Support Trace Framework."""

from shared.audit.exceptions import AuditError as SharedAuditError
from shared.audit.exceptions import (
    AuditBuilderError as SharedAuditBuilderError,
    AuditRepositoryError as SharedAuditRepositoryError,
    AuditSerializationError as SharedAuditSerializationError,
    AuditValidationError as SharedAuditValidationError,
)


class SupportTraceError(SharedAuditError):
    """Base error for Support Trace operations."""


class TraceValidationError(SupportTraceError, SharedAuditValidationError):
    """Raised when trace input fails validation."""


class TraceBuilderError(SupportTraceError, SharedAuditBuilderError):
    """Raised when trace record construction fails."""


class TraceRepositoryError(SupportTraceError, SharedAuditRepositoryError):
    """Raised when trace persistence fails."""


class TraceSerializationError(SupportTraceError, SharedAuditSerializationError):
    """Raised when trace data cannot be serialized."""


class SupportTraceConcurrencyError(TraceRepositoryError):
    """Raised when optimistic concurrency check fails on upsert."""


class WorkflowTransitionError(TraceValidationError):
    """Raised when a workflow state transition is not allowed."""


class WorkflowSyncError(SupportTraceError):
    """Raised when audit → Support Trace synchronization fails."""
