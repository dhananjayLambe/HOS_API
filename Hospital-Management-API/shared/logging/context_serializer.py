"""Transport-agnostic LogContext serialization for the DoctorProCare logging platform.

Purpose:
    Serialize and deserialize execution context for propagation across process
    boundaries (Celery, future CLI/OTEL transports).

Responsibility:
    Convert LogContext to and from JSON-safe flat dictionaries only.
    No Celery or Django imports.
"""

from __future__ import annotations

from shared.logging.constants import CONTEXT_FIELD_NAMES
from shared.logging.context import LogContext
from shared.logging.correlation import is_valid_correlation_id, parse_correlation_id


def is_empty_log_context(context: LogContext) -> bool:
    """Return whether the context carries no propagated field values."""
    return all(getattr(context, field) is None for field in CONTEXT_FIELD_NAMES)


def serialize_log_context(context: LogContext) -> dict[str, str]:
    """Serialize a LogContext to a JSON-safe dictionary.

    Args:
        context: Active execution context snapshot.

    Returns:
        dict[str, str]: Non-null context fields only.
    """
    payload: dict[str, str] = {}
    for field in CONTEXT_FIELD_NAMES:
        value = getattr(context, field)
        if value is not None:
            payload[field] = value
    return payload


def deserialize_log_context(data: object) -> LogContext:
    """Deserialize a payload into a LogContext.

    Invalid payloads or correlation IDs produce an empty context without raising,
    so background tasks never fail due to malformed propagation metadata.

    Args:
        data: Serialized context payload.

    Returns:
        LogContext: Restored context or an empty context on invalid input.
    """
    if not isinstance(data, dict):
        return LogContext()

    fields: dict[str, str] = {}
    for field in CONTEXT_FIELD_NAMES:
        value = data.get(field)
        if value is None:
            continue
        if not isinstance(value, str) or not value:
            return LogContext()
        fields[field] = value

    correlation_id = fields.get("correlation_id")
    if correlation_id is not None and not is_valid_correlation_id(correlation_id):
        return LogContext()

    if correlation_id is not None:
        fields["correlation_id"] = parse_correlation_id(correlation_id).to_string()

    return LogContext(**fields)
