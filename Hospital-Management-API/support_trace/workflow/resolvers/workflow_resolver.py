"""Resolve workflow identity from audit rows / SyncEvents."""

from __future__ import annotations

from typing import Any

from business_audit.enums import BusinessResourceType, WorkflowType
from clinical_audit.enums import ClinicalEntity
from support_trace.domain.workflow_relationships import resolve_workflow_depth
from support_trace.enums import TraceSource
from support_trace.workflow.constants import (
    CONSULTATION_WORKFLOW_PREFIX,
    PRESCRIPTION_WORKFLOW_PREFIX,
    REPORT_WORKFLOW_PREFIX,
)
from support_trace.workflow.registries import infer_workflow_type_from_action
from support_trace.workflow.types import ResolvedWorkflow


class WorkflowResolver:
    """Derives workflow_type, workflow_instance_id, and resource identity."""

    @classmethod
    def resolve_from_business_audit(cls, audit: Any) -> ResolvedWorkflow:
        return ResolvedWorkflow(
            workflow_instance_id=str(audit.workflow_instance_id),
            workflow_type=str(audit.workflow_type),
            resource_type=str(audit.resource_type),
            resource_id=str(audit.resource_id),
            organization_id=str(audit.organization_id),
            parent_workflow_instance_id=audit.parent_workflow_instance_id,
            workflow_depth=resolve_workflow_depth(str(audit.workflow_type)),
            action=str(audit.action),
            last_event=str(audit.event),
            correlation_id=getattr(audit, "correlation_id", None),
            request_id=getattr(audit, "request_id", None),
            last_sequence_no=getattr(audit, "sequence_no", None),
            event_at=getattr(audit, "created_at", None),
            payload=dict(getattr(audit, "payload", None) or {}),
        )

    @classmethod
    def resolve_from_clinical_audit(cls, audit: Any) -> ResolvedWorkflow:
        action = str(audit.action)
        wf_type = infer_workflow_type_from_action(
            action, source=TraceSource.CLINICAL_AUDIT
        ) or WorkflowType.CONSULTATION

        consultation_id = getattr(audit, "consultation_id", None)
        resource_id = str(audit.resource_id)
        organization_id = cls._clinical_organization_id(audit)

        if wf_type == WorkflowType.PRESCRIPTION:
            workflow_instance_id = f"{PRESCRIPTION_WORKFLOW_PREFIX}{resource_id}"
            parent = (
                f"{CONSULTATION_WORKFLOW_PREFIX}{consultation_id}"
                if consultation_id
                else None
            )
            mapped_resource = BusinessResourceType.PRESCRIPTION
        elif wf_type == WorkflowType.DIAGNOSTIC_REPORT:
            workflow_instance_id = f"{REPORT_WORKFLOW_PREFIX}{resource_id}"
            parent = (
                f"{CONSULTATION_WORKFLOW_PREFIX}{consultation_id}"
                if consultation_id
                else None
            )
            mapped_resource = BusinessResourceType.REPORT
        else:
            cid = consultation_id or resource_id
            workflow_instance_id = f"{CONSULTATION_WORKFLOW_PREFIX}{cid}"
            parent = None
            mapped_resource = BusinessResourceType.CONSULTATION
            resource_id = str(cid)

        return ResolvedWorkflow(
            workflow_instance_id=workflow_instance_id,
            workflow_type=str(wf_type),
            resource_type=str(mapped_resource),
            resource_id=resource_id,
            organization_id=organization_id,
            parent_workflow_instance_id=parent,
            workflow_depth=resolve_workflow_depth(str(wf_type)),
            action=action,
            last_event=str(audit.event),
            correlation_id=getattr(audit, "correlation_id", None),
            request_id=None,
            last_sequence_no=None,
            event_at=getattr(audit, "timestamp", None)
            or getattr(audit, "occurred_at", None),
            payload=dict(getattr(audit, "payload", None) or {}),
        )

    @staticmethod
    def _clinical_organization_id(audit: Any) -> str:
        new_value = getattr(audit, "new_value", None) or {}
        if isinstance(new_value, dict):
            meta = new_value.get("_meta") or {}
            if isinstance(meta, dict) and meta.get("organization_id"):
                return str(meta["organization_id"])
            if new_value.get("organization_id"):
                return str(new_value["organization_id"])
        org = getattr(audit, "organization_id", None)
        return str(org or "")

    @classmethod
    def resolve_from_sync_event(cls, event: Any) -> ResolvedWorkflow:
        """Resolve from an already-built SupportTraceSyncEvent."""
        return ResolvedWorkflow(
            workflow_instance_id=event.workflow_instance_id,
            workflow_type=str(event.workflow_type),
            resource_type=str(event.resource_type),
            resource_id=str(event.resource_id),
            organization_id=str(event.organization_id),
            parent_workflow_instance_id=event.parent_workflow_instance_id,
            workflow_depth=int(event.workflow_depth or 0),
            action=getattr(event, "action", None) or event.last_event,
            last_event=event.last_event,
            correlation_id=event.correlation_id,
            request_id=event.request_id,
            last_sequence_no=event.last_sequence_no,
            event_at=event.event_at,
            identifiers=dict(event.identifiers or {}),
            payload=dict(getattr(event, "payload", None) or {}),
        )
