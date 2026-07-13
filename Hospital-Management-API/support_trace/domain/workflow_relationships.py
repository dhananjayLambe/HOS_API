"""Workflow hierarchy depth and parent validation."""

from __future__ import annotations

from business_audit.enums import WorkflowType

_WORKFLOW_DEPTH: dict[str, int] = {
    WorkflowType.RECOMMENDATION: 0,
    WorkflowType.CONSULTATION: 0,
    WorkflowType.BOOKING: 1,
    WorkflowType.PRESCRIPTION: 1,
    WorkflowType.ROUTING: 2,
    WorkflowType.DIAGNOSTIC_REPORT: 2,
    WorkflowType.REPORT_DELIVERY: 3,
    WorkflowType.NOTIFICATION: 2,
    WorkflowType.PAYMENT: 2,
    WorkflowType.WHATSAPP_FLOW: 1,
}


def resolve_workflow_depth(
    workflow_type: str,
    *,
    explicit_depth: int | None = None,
) -> int:
    if explicit_depth is not None and explicit_depth >= 0:
        return explicit_depth
    return _WORKFLOW_DEPTH.get(str(workflow_type), 0)


def validate_parent_workflow(
    *,
    workflow_instance_id: str,
    parent_workflow_instance_id: str | None,
) -> None:
    if parent_workflow_instance_id and parent_workflow_instance_id == workflow_instance_id:
        raise ValueError("parent_workflow_instance_id cannot equal workflow_instance_id.")
