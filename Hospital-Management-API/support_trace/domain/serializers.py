"""Internal DTO serialization for Support Trace (not REST)."""

from __future__ import annotations

from typing import Any

from support_trace.models import SupportTrace


def trace_to_dict(trace: SupportTrace) -> dict[str, Any]:
    return {
        "id": str(trace.id),
        "trace_version": trace.trace_version,
        "projection_version": trace.projection_version,
        "workflow_fingerprint": trace.workflow_fingerprint,
        "correlation_id": trace.correlation_id,
        "workflow_instance_id": trace.workflow_instance_id,
        "parent_workflow_instance_id": trace.parent_workflow_instance_id,
        "workflow_depth": trace.workflow_depth,
        "workflow_type": trace.workflow_type,
        "resource_type": trace.resource_type,
        "resource_id": trace.resource_id,
        "organization_id": trace.organization_id,
        "status": trace.status,
        "current_state": trace.current_state,
        "workflow_step": trace.workflow_step,
        "last_event": trace.last_event,
        "last_sequence_no": trace.last_sequence_no,
        "last_source": trace.last_source,
        "sync_status": trace.sync_status,
        "workflow_health": trace.workflow_health,
        "first_event_at": trace.first_event_at.isoformat() if trace.first_event_at else None,
        "last_event_at": trace.last_event_at.isoformat() if trace.last_event_at else None,
        "started_at": trace.started_at.isoformat() if trace.started_at else None,
        "completed_at": trace.completed_at.isoformat() if trace.completed_at else None,
        "duration_ms": trace.duration_ms,
        "retry_count": trace.retry_count,
        "booking_id": trace.booking_id,
        "patient_account_id": trace.patient_account_id,
        "phone_number": trace.phone_number,
        "created_at": trace.created_at.isoformat(),
        "updated_at": trace.updated_at.isoformat(),
    }
