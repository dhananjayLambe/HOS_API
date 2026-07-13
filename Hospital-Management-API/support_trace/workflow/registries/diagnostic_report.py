"""Diagnostic report workflow event registry (clinical)."""

from __future__ import annotations

from business_audit.enums import WorkflowType
from support_trace.enums import TraceStatus
from support_trace.workflow.types import WorkflowStateTransition

_MAP: dict[str, WorkflowStateTransition] = {
    "report.uploaded": WorkflowStateTransition(
        current_state="Uploaded",
        workflow_step="Uploading Report",
        trace_status=TraceStatus.STARTED,
    ),
    "report.approved": WorkflowStateTransition(
        current_state="Verified",
        workflow_step="Report Verified",
        trace_status=TraceStatus.RUNNING,
    ),
    "report.viewed": WorkflowStateTransition(
        current_state="Viewed",
        workflow_step="Waiting for Patient View",
        trace_status=TraceStatus.RUNNING,
    ),
    "report.downloaded": WorkflowStateTransition(
        current_state="Downloaded",
        workflow_step="Report Downloaded",
        trace_status=TraceStatus.RUNNING,
    ),
    "report.shared": WorkflowStateTransition(
        current_state="Shared",
        workflow_step="Report Shared",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
    ),
}


class DiagnosticReportRegistry:
    workflow_type = WorkflowType.DIAGNOSTIC_REPORT

    def resolve(self, action: str) -> WorkflowStateTransition | None:
        return _MAP.get(str(action))
