"""Internal context enrichment for the DoctorProCare logging platform.

Purpose:
    Retrieve active request context and supply immutable enrichment data to the
    logger without coupling logger.py to ContextVar or ContextManager.

Responsibility:
    Copy LogContext fields into ContextEnrichment; validate reserved metadata
    keys. Not part of the public package API.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from shared.logging.constants import CONTEXT_FIELD_NAMES, FRAMEWORK_CONTEXT_FIELDS
from shared.logging.context import ContextProvider, LogContext
from shared.logging.exceptions import LoggingError


@dataclass(frozen=True, slots=True)
class ContextEnrichment:
    """Immutable snapshot of framework-managed context fields for a log record."""

    correlation_id: str | None = None
    request_id: str | None = None
    user_id: str | None = None
    user_role: str | None = None
    patient_account_id: str | None = None
    patient_profile_id: str | None = None
    consultation_id: str | None = None
    encounter_id: str | None = None
    recommendation_id: str | None = None
    booking_id: str | None = None
    laboratory_id: str | None = None
    report_id: str | None = None
    whatsapp_message_id: str | None = None

    @classmethod
    def from_log_context(cls, context: LogContext) -> ContextEnrichment:
        """Build enrichment from a LogContext without mutating it."""
        return cls(
            **{field: getattr(context, field) for field in CONTEXT_FIELD_NAMES}
        )

    @classmethod
    def empty(cls) -> ContextEnrichment:
        """Return enrichment with all context fields unset."""
        return cls()


class ContextEnricher(Protocol):
    """Protocol for components that supply context enrichment to the logger."""

    def enrich(self) -> ContextEnrichment:
        """Return immutable context enrichment for the current execution scope."""


class DefaultContextEnricher:
    """Retrieves context via ContextManager and returns a safe copy."""

    def __init__(self, context_provider: ContextProvider | None = None) -> None:
        if context_provider is None:
            from shared.logging.context import get_context_manager

            self._provider = get_context_manager()
        else:
            self._provider = context_provider

    def enrich(self) -> ContextEnrichment:
        """Return context enrichment for the active scope, or empty enrichment."""
        return ContextEnrichment.from_log_context(self._provider.get())


_default_context_enricher = DefaultContextEnricher()


def get_default_context_enricher() -> DefaultContextEnricher:
    """Return the module-level default context enricher instance."""
    return _default_context_enricher


def validate_framework_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    """Reject metadata keys reserved for framework-managed context fields.

    Args:
        metadata: Caller-supplied business metadata.

    Returns:
        dict[str, Any]: The same metadata if valid.

    Raises:
        LoggingError: If metadata contains reserved framework context keys.
    """
    for key in metadata:
        if key in FRAMEWORK_CONTEXT_FIELDS:
            raise LoggingError(
                f"metadata must not contain reserved key: {key}"
            )
    return metadata
