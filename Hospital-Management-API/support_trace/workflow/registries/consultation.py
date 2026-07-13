"""Consultation workflow event registry (clinical)."""

from __future__ import annotations

from business_audit.enums import WorkflowType
from support_trace.enums import TraceStatus
from support_trace.workflow.types import WorkflowStateTransition

_MAP: dict[str, WorkflowStateTransition] = {
    "consultation.started": WorkflowStateTransition(
        current_state="Started",
        workflow_step="Consultation Started",
        trace_status=TraceStatus.STARTED,
    ),
    "consultation.completed": WorkflowStateTransition(
        current_state="Completed",
        workflow_step="Consultation Completed",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
    ),
    "consultation.cancelled": WorkflowStateTransition(
        current_state="Cancelled",
        workflow_step="Consultation Cancelled",
        trace_status=TraceStatus.CANCELLED,
        finalize_duration=True,
    ),
    "consultation.findings.updated": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Updating Findings",
        trace_status=TraceStatus.RUNNING,
    ),
    "consultation.instructions.updated": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Updating Instructions",
        trace_status=TraceStatus.RUNNING,
    ),
    "consultation.investigations.updated": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Updating Investigations",
        trace_status=TraceStatus.RUNNING,
    ),
    "diagnosis.added": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Adding Diagnosis",
        trace_status=TraceStatus.RUNNING,
    ),
    "diagnosis.updated": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Updating Diagnosis",
        trace_status=TraceStatus.RUNNING,
    ),
    "diagnosis.removed": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Removing Diagnosis",
        trace_status=TraceStatus.RUNNING,
    ),
    "vitals.recorded": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Recording Vitals",
        trace_status=TraceStatus.RUNNING,
    ),
    "symptoms.recorded": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Recording Symptoms",
        trace_status=TraceStatus.RUNNING,
    ),
    "allergy.added": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Adding Allergy",
        trace_status=TraceStatus.RUNNING,
    ),
    "allergy.updated": WorkflowStateTransition(
        current_state="Documentation",
        workflow_step="Updating Allergy",
        trace_status=TraceStatus.RUNNING,
    ),
}


class ConsultationRegistry:
    workflow_type = WorkflowType.CONSULTATION

    def resolve(self, action: str) -> WorkflowStateTransition | None:
        return _MAP.get(str(action))
