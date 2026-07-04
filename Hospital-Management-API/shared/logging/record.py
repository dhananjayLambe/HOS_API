"""Immutable log record model for the DoctorProCare logging platform.

Purpose:
    Define the internal structured representation of every log event.

Responsibility:
    Provide a frozen LogRecord dataclass, build_record() factory, and
    context enrichment via enrich_record().

Future implementation:
    Additional workflow fields may be added as observability expands.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from typing import Any, Mapping

from shared.logging.constants import (
    CONTEXT_FIELD_NAMES,
    SCHEMA_VERSION,
    EventType,
    LogLevel,
    LogModule,
    LogStatus,
)
from shared.logging.context_enricher import ContextEnrichment


@dataclass(frozen=True)
class LogRecord:
    """Immutable structured log record.

    Attributes:
        timestamp: UTC timestamp when the record was created.
        level: Log severity level.
        module: Originating module identifier, if applicable.
        action: Dot-notation action name.
        message: Human-readable log message.
        status: Workflow outcome status.
        metadata: Workflow-specific fields (deep-copied at build time).
        event_code: Optional machine-readable event code (e.g. DP1001).
        schema_version: Record schema version for forward compatibility.
        audit_type: Audit category for audit() calls.
        duration_ms: Execution duration for performance() calls.
        exception_type: Exception class name for exception() calls.
        exception_message: Exception message for exception() calls.
        stack_trace: Formatted stack trace for exception() calls.
        correlation_id: End-to-end workflow identifier from request context.
        request_id: Per-request identifier from request context.
        user_id: Authenticated user identifier from request context.
        user_role: Role of the authenticated user from request context.
        patient_account_id: Patient account identifier from request context.
        patient_profile_id: Patient profile identifier from request context.
        consultation_id: Consultation identifier from request context.
        encounter_id: Encounter identifier from request context.
        recommendation_id: Recommendation identifier from request context.
        booking_id: Booking identifier from request context.
        laboratory_id: Laboratory identifier from request context.
        report_id: Report identifier from request context.
        whatsapp_message_id: WhatsApp message identifier from request context.
    """

    timestamp: datetime
    level: LogLevel
    module: LogModule | None
    action: str
    message: str
    status: LogStatus
    metadata: Mapping[str, Any]
    event_code: str | None
    schema_version: int
    audit_type: EventType | None = None
    duration_ms: float | None = None
    exception_type: str | None = None
    exception_message: str | None = None
    stack_trace: str | None = None
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


def build_record(
    *,
    level: LogLevel,
    action: str,
    message: str,
    status: LogStatus,
    module: LogModule | None = None,
    metadata: dict[str, Any] | None = None,
    event_code: str | None = None,
    audit_type: EventType | None = None,
    duration_ms: float | None = None,
    exception_type: str | None = None,
    exception_message: str | None = None,
    stack_trace: str | None = None,
    timestamp: datetime | None = None,
) -> LogRecord:
    """Build an immutable LogRecord with safe metadata copying.

    Args:
        level: Log severity level.
        action: Dot-notation action name.
        message: Human-readable log message.
        status: Workflow outcome status.
        module: Originating module identifier, if applicable.
        metadata: Optional workflow-specific fields (deep-copied).
        event_code: Optional machine-readable event code.
        audit_type: Audit category for audit() calls.
        duration_ms: Execution duration for performance() calls.
        exception_type: Exception class name for exception() calls.
        exception_message: Exception message for exception() calls.
        stack_trace: Formatted stack trace for exception() calls.
        timestamp: Optional explicit timestamp (defaults to UTC now).

    Returns:
        LogRecord: Immutable log record ready for enrichment and dispatch.
    """
    safe_metadata = copy.deepcopy(metadata) if metadata else {}
    return LogRecord(
        timestamp=timestamp or datetime.now(timezone.utc),
        level=level,
        module=module,
        action=action,
        message=message,
        status=status,
        metadata=safe_metadata,
        event_code=event_code,
        schema_version=SCHEMA_VERSION,
        audit_type=audit_type,
        duration_ms=duration_ms,
        exception_type=exception_type,
        exception_message=exception_message,
        stack_trace=stack_trace,
    )


def enrich_record(
    record: LogRecord,
    enrichment: ContextEnrichment,
) -> LogRecord:
    """Merge framework context enrichment into a log record.

    Args:
        record: Base immutable log record.
        enrichment: Context fields to apply; None values are skipped.

    Returns:
        LogRecord: New immutable record with context fields applied.
    """
    updates: dict[str, str] = {}
    for field in CONTEXT_FIELD_NAMES:
        value = getattr(enrichment, field)
        if value is not None:
            updates[field] = value
    if not updates:
        return record
    return replace(record, **updates)
