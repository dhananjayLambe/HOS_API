"""Routing workflow event registry."""

from __future__ import annotations

from business_audit.enums import WorkflowType
from support_trace.enums import TraceStatus
from support_trace.workflow.types import WorkflowStateTransition

_MAP: dict[str, WorkflowStateTransition] = {
    "routing.started": WorkflowStateTransition(
        current_state="Started",
        workflow_step="Finding Candidate Labs",
        trace_status=TraceStatus.STARTED,
    ),
    "routing.lab_matched": WorkflowStateTransition(
        current_state="Matched",
        workflow_step="Labs Matched",
        trace_status=TraceStatus.RUNNING,
    ),
    "routing.price_compared": WorkflowStateTransition(
        current_state="Compared",
        workflow_step="Comparing Prices",
        trace_status=TraceStatus.RUNNING,
    ),
    "routing.discount_applied": WorkflowStateTransition(
        current_state="Discounted",
        workflow_step="Discount Applied",
        trace_status=TraceStatus.RUNNING,
    ),
    "routing.lab_assigned": WorkflowStateTransition(
        current_state="Assigned",
        workflow_step="Lab Assigned",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
    ),
    "routing.failed": WorkflowStateTransition(
        current_state="Failed",
        workflow_step="Routing Failed",
        trace_status=TraceStatus.FAILED,
        finalize_duration=True,
    ),
    "routing.manual_override": WorkflowStateTransition(
        current_state="Manual Override",
        workflow_step="Manual Lab Override",
        trace_status=TraceStatus.RUNNING,
        allow_regression=True,
    ),
    "routing.rule_evaluated": WorkflowStateTransition(
        current_state="Started",
        workflow_step="Evaluating Routing Rules",
        trace_status=TraceStatus.RUNNING,
    ),
}


class RoutingRegistry:
    workflow_type = WorkflowType.ROUTING

    def resolve(self, action: str) -> WorkflowStateTransition | None:
        return _MAP.get(str(action))
