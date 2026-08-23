"""Internal context enrichment for the DoctorProCare logging platform.

Purpose:
    Retrieve active request context and supply immutable enrichment data to the
    logger without coupling logger.py to ContextVar or ContextManager.

Responsibility:
    Copy LogContext fields into ContextEnrichment; strip reserved metadata
    keys onto LogContext. Not part of the public package API.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from shared.logging.constants import CONTEXT_FIELD_NAMES, FRAMEWORK_CONTEXT_FIELDS
from shared.logging.context import ContextProvider, LogContext


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


# Request-scoped fields owned by middleware. Never copy these from caller metadata.
_MIDDLEWARE_CONTEXT_FIELDS = frozenset(
    {"correlation_id", "request_id", "user_id", "user_role"}
)


def validate_framework_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    """Strip reserved context keys from metadata instead of failing the request.

    Callers historically put ``encounter_id`` / ``consultation_id`` in ``metadata``.
    Those keys belong on LogContext. Raising LoggingError turned clinical POSTs into
    HTTP 500s in every environment. Pop the keys, copy domain IDs onto context when
    unset, and let the log line succeed.

    Args:
        metadata: Caller-supplied business metadata (mutated in place).

    Returns:
        dict[str, Any]: Metadata with framework context keys removed.
    """
    reserved_values: dict[str, Any] = {}
    for key in list(metadata.keys()):
        if key in FRAMEWORK_CONTEXT_FIELDS:
            reserved_values[key] = metadata.pop(key)

    domain_fields = {
        key: value
        for key, value in reserved_values.items()
        if key not in _MIDDLEWARE_CONTEXT_FIELDS and value not in (None, "")
    }
    if domain_fields:
        from shared.logging.context import get_context_manager

        manager = get_context_manager()
        current = manager.get()
        to_apply = {
            key: str(value)
            for key, value in domain_fields.items()
            if not getattr(current, key, None)
        }
        if to_apply:
            manager.update(**to_apply)
    return metadata
