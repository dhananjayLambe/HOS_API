"""Map audit workflow statuses to Support Trace TraceStatus."""

from __future__ import annotations

from business_audit.enums import WorkflowStatus
from clinical_audit.enums import AuditOutcome
from support_trace.enums import TraceStatus

_WORKFLOW_STATUS_MAP: dict[str, TraceStatus] = {
    WorkflowStatus.STARTED: TraceStatus.STARTED,
    WorkflowStatus.QUEUED: TraceStatus.WAITING,
    WorkflowStatus.RUNNING: TraceStatus.RUNNING,
    WorkflowStatus.SUCCEEDED: TraceStatus.COMPLETED,
    WorkflowStatus.COMPLETED: TraceStatus.COMPLETED,
    WorkflowStatus.FAILED: TraceStatus.FAILED,
    WorkflowStatus.CANCELLED: TraceStatus.CANCELLED,
    WorkflowStatus.RETRYING: TraceStatus.WAITING,
    WorkflowStatus.TIMED_OUT: TraceStatus.EXPIRED,
    WorkflowStatus.SKIPPED: TraceStatus.CANCELLED,
}


def map_workflow_status(status: str | WorkflowStatus | None) -> TraceStatus:
    if status is None:
        return TraceStatus.RUNNING
    key = status.value if isinstance(status, WorkflowStatus) else str(status)
    return _WORKFLOW_STATUS_MAP.get(key, TraceStatus.RUNNING)


def map_clinical_outcome(
    outcome: str | AuditOutcome | None,
    *,
    action: str = "",
) -> TraceStatus:
    action_l = str(action)
    if action_l.endswith(".cancelled") or action_l == "consultation.cancelled":
        return TraceStatus.CANCELLED
    if action_l.endswith(".completed") or action_l == "consultation.completed":
        return TraceStatus.COMPLETED
    if outcome is None:
        return TraceStatus.RUNNING
    val = outcome.value if isinstance(outcome, AuditOutcome) else str(outcome)
    if val == AuditOutcome.FAILED:
        return TraceStatus.FAILED
    if action_l in (
        "prescription.downloaded",
        "prescription.shared",
        "report.shared",
    ):
        return TraceStatus.COMPLETED
    return TraceStatus.RUNNING
