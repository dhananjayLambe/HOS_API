"""Recommendation workflow event registry."""

from __future__ import annotations

from business_audit.enums import WorkflowType
from support_trace.enums import TraceStatus
from support_trace.workflow.types import WorkflowStateTransition

_MAP: dict[str, WorkflowStateTransition] = {
    "recommendation.generated": WorkflowStateTransition(
        current_state="Generated",
        workflow_step="Generating Recommendation",
        trace_status=TraceStatus.STARTED,
    ),
    "workflow.queued": WorkflowStateTransition(
        current_state="Queued",
        workflow_step="Waiting for WhatsApp Delivery",
        trace_status=TraceStatus.WAITING,
    ),
    "recommendation.sent": WorkflowStateTransition(
        current_state="Sent",
        workflow_step="Recommendation Sent",
        trace_status=TraceStatus.RUNNING,
    ),
    "recommendation.delivered": WorkflowStateTransition(
        current_state="Delivered",
        workflow_step="Recommendation Delivered",
        trace_status=TraceStatus.RUNNING,
    ),
    "recommendation.read": WorkflowStateTransition(
        current_state="Read",
        workflow_step="Recommendation Read",
        trace_status=TraceStatus.RUNNING,
    ),
    "recommendation.failed": WorkflowStateTransition(
        current_state="Failed",
        workflow_step="Recommendation Failed",
        trace_status=TraceStatus.FAILED,
        finalize_duration=True,
    ),
    "recommendation.retried": WorkflowStateTransition(
        current_state="Retry",
        workflow_step="Retrying Recommendation Delivery",
        trace_status=TraceStatus.WAITING,
        increment_retry=True,
        allow_regression=True,
        snapshot_patch={"retry_reason": "recommendation_retried"},
    ),
    "recommendation.expired": WorkflowStateTransition(
        current_state="Expired",
        workflow_step="Recommendation Expired",
        trace_status=TraceStatus.EXPIRED,
        finalize_duration=True,
    ),
    "workflow.completed": WorkflowStateTransition(
        current_state="Completed",
        workflow_step="Recommendation Completed",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
    ),
}


class RecommendationRegistry:
    workflow_type = WorkflowType.RECOMMENDATION

    def resolve(self, action: str) -> WorkflowStateTransition | None:
        return _MAP.get(str(action))
