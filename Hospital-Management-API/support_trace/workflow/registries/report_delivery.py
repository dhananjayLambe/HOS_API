"""Report delivery workflow event registry."""

from __future__ import annotations

from business_audit.enums import WorkflowType
from support_trace.enums import TraceStatus
from support_trace.workflow.types import WorkflowStateTransition

_MAP: dict[str, WorkflowStateTransition] = {
    "report.ready": WorkflowStateTransition(
        current_state="Ready",
        workflow_step="Report Ready",
        trace_status=TraceStatus.STARTED,
    ),
    "report.delivery_requested": WorkflowStateTransition(
        current_state="Requested",
        workflow_step="Delivery Requested",
        trace_status=TraceStatus.WAITING,
    ),
    "report.whatsapp_delivery": WorkflowStateTransition(
        current_state="Delivered",
        workflow_step="WhatsApp Delivery",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
        snapshot_patch={"current_channel": "WhatsApp"},
    ),
    "report.email_delivery": WorkflowStateTransition(
        current_state="Delivered",
        workflow_step="Email Delivery",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
        snapshot_patch={"current_channel": "Email"},
    ),
    "report.sms_delivery": WorkflowStateTransition(
        current_state="Delivered",
        workflow_step="SMS Delivery",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
        snapshot_patch={"current_channel": "SMS"},
    ),
    "report.portal_delivery": WorkflowStateTransition(
        current_state="Delivered",
        workflow_step="Portal Delivery",
        trace_status=TraceStatus.COMPLETED,
        finalize_duration=True,
        snapshot_patch={"current_channel": "Portal"},
    ),
    "report.delivery_failed": WorkflowStateTransition(
        current_state="Failed",
        workflow_step="Delivery Failed",
        trace_status=TraceStatus.FAILED,
        finalize_duration=True,
    ),
    "report.delivery_retried": WorkflowStateTransition(
        current_state="Retry",
        workflow_step="Retrying Delivery",
        trace_status=TraceStatus.WAITING,
        increment_retry=True,
        allow_regression=True,
        snapshot_patch={"retry_reason": "delivery_retried"},
    ),
}


class ReportDeliveryRegistry:
    workflow_type = WorkflowType.REPORT_DELIVERY

    def resolve(self, action: str) -> WorkflowStateTransition | None:
        return _MAP.get(str(action))
