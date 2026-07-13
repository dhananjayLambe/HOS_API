"""Shared test helpers for incident reconstruction."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.enums import TraceStatus
from support_trace.tests.support import record_trace_event, setup_trace_context
from support_trace.timeline.types import TimelineEvent


def make_timeline_event(**overrides) -> TimelineEvent:
    defaults = {
        "timeline_event_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc),
        "timeline_sequence": 1,
        "event": "test.event",
        "category": "Business",
        "severity": "Error",
        "tags": (),
        "source": "business",
        "workflow_type": "Booking",
        "workflow_instance_id": str(uuid.uuid4()),
        "parent_workflow_instance_id": None,
        "correlation_id": None,
        "patient_account_id": None,
        "consultation_id": None,
        "resource_type": None,
        "resource_id": None,
        "actor": None,
        "status": None,
        "state_before": None,
        "state_after": None,
        "summary": "Test event",
        "reference_id": "",
        "reference_type": "",
        "sequence_no": None,
        "action": None,
    }
    defaults.update(overrides)
    return TimelineEvent(**defaults)


def setup_booking_chain(
    *,
    booking_id: str | None = None,
    correlation_id: str | None = None,
    whatsapp_failed: bool = False,
    retry_count: int = 0,
):
    """Create a minimal booking workflow trace for incident tests."""
    booking_id = booking_id or str(uuid.uuid4())
    clinic, corr_id, wf_id = setup_trace_context(
        correlation_id=correlation_id,
        booking_id=booking_id,
    )
    status = TraceStatus.FAILED if whatsapp_failed else TraceStatus.COMPLETED
    trace = record_trace_event(
        clinic,
        wf_id,
        correlation_id=corr_id,
        workflow_type=WorkflowType.BOOKING,
        resource_type=BusinessResourceType.BOOKING,
        resource_id=booking_id,
        status=status,
        retry_count=retry_count,
        identifiers={"booking_id": booking_id},
        finalize_duration=True,
        last_event="booking.failed" if whatsapp_failed else "booking.completed",
    )
    return clinic, corr_id, wf_id, booking_id, trace
