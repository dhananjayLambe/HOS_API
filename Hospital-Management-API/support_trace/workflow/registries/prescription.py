"""Prescription workflow event registry (clinical)."""

from __future__ import annotations

from business_audit.enums import WorkflowType
from support_trace.enums import TraceStatus
from support_trace.workflow.types import WorkflowStateTransition

_MAP: dict[str, WorkflowStateTransition] = {
    "prescription.created": WorkflowStateTransition(
        current_state="Created",
        workflow_step="Prescription Created",
        trace_status=TraceStatus.STARTED,
    ),
    "prescription.signed": WorkflowStateTransition(
        current_state="Signed",
        workflow_step="Prescription Signed",
        trace_status=TraceStatus.RUNNING,
    ),
    "prescription.downloaded": WorkflowStateTransition(
        current_state="Delivered",
        workflow_step="Prescription Downloaded",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
    ),
    "prescription.shared": WorkflowStateTransition(
        current_state="Delivered",
        workflow_step="Prescription Shared",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
    ),
    "prescription.generated": WorkflowStateTransition(
        current_state="Created",
        workflow_step="Prescription Generated",
        trace_status=TraceStatus.STARTED,
    ),
}


class PrescriptionRegistry:
    workflow_type = WorkflowType.PRESCRIPTION

    def resolve(self, action: str) -> WorkflowStateTransition | None:
        return _MAP.get(str(action))
