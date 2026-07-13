"""Booking workflow event registry."""

from __future__ import annotations

from business_audit.enums import WorkflowType
from support_trace.enums import TraceStatus
from support_trace.workflow.types import WorkflowStateTransition

_MAP: dict[str, WorkflowStateTransition] = {
    "booking.created": WorkflowStateTransition(
        current_state="Created",
        workflow_step="Booking Created",
        trace_status=TraceStatus.STARTED,
        snapshot_patch={"booking_status": "CREATED"},
    ),
    "booking.confirmed": WorkflowStateTransition(
        current_state="Confirmed",
        workflow_step="Booking Confirmed",
        trace_status=TraceStatus.RUNNING,
        snapshot_patch={"booking_status": "CONFIRMED"},
    ),
    "booking.modified": WorkflowStateTransition(
        current_state="Modified",
        workflow_step="Booking Modified",
        trace_status=TraceStatus.RUNNING,
        snapshot_patch={"booking_status": "MODIFIED"},
    ),
    "booking.cancelled": WorkflowStateTransition(
        current_state="Cancelled",
        workflow_step="Booking Cancelled",
        trace_status=TraceStatus.CANCELLED,
        finalize_duration=True,
        snapshot_patch={"booking_status": "CANCELLED"},
    ),
    "booking.expired": WorkflowStateTransition(
        current_state="Expired",
        workflow_step="Booking Expired",
        trace_status=TraceStatus.EXPIRED,
        finalize_duration=True,
        snapshot_patch={"booking_status": "EXPIRED"},
    ),
    "booking.closed": WorkflowStateTransition(
        current_state="Closed",
        workflow_step="Booking Closed",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
        snapshot_patch={"booking_status": "CLOSED"},
    ),
}


class BookingRegistry:
    workflow_type = WorkflowType.BOOKING

    def resolve(self, action: str) -> WorkflowStateTransition | None:
        return _MAP.get(str(action))
