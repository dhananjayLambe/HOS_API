"""Build Support Trace projection records — normalization only."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from business_audit.enums import BusinessResourceType, WorkflowType
from shared.audit.base_builder import BaseAuditBuilder
from support_trace.constants import PROJECTION_VERSION_DEFAULT, TRACE_VERSION_DEFAULT
from support_trace.domain.context import context_identifier_values, resolve_trace_context
from support_trace.domain.fingerprint import compute_workflow_fingerprint
from support_trace.domain.lookup_keys import build_search_vector, merge_identifiers
from support_trace.domain.types import ValidatedSupportTraceRequest
from support_trace.domain.workflow_relationships import resolve_workflow_depth
from support_trace.enums import SyncStatus, TraceSource, TraceStatus, WorkflowHealth


class SupportTraceBuilder(BaseAuditBuilder):
    """Normalize and assemble trace fields. No business-rule derivation."""

    @classmethod
    def build(
        cls,
        validated: ValidatedSupportTraceRequest,
    ) -> dict[str, Any]:
        return {
            "trace_version": validated.trace_version,
            "projection_version": validated.projection_version,
            "workflow_fingerprint": validated.workflow_fingerprint,
            "correlation_id": validated.correlation_id,
            "request_id": validated.request_id,
            "workflow_instance_id": validated.workflow_instance_id,
            "parent_workflow_instance_id": validated.parent_workflow_instance_id,
            "workflow_depth": validated.workflow_depth,
            "workflow_type": validated.workflow_type,
            "resource_type": validated.resource_type,
            "resource_id": validated.resource_id,
            "organization_id": validated.organization_id,
            "status": validated.status,
            "current_state": validated.current_state,
            "workflow_step": validated.workflow_step,
            "last_event": validated.last_event,
            "last_sequence_no": validated.last_sequence_no,
            "last_source": validated.last_source,
            "sync_status": validated.sync_status,
            "workflow_health": validated.workflow_health,
            "first_event_at": validated.first_event_at,
            "last_event_at": validated.last_event_at,
            "started_at": validated.started_at,
            "completed_at": validated.completed_at,
            "duration_ms": validated.duration_ms,
            "retry_count": validated.retry_count,
            "last_clinical_audit_id": validated.last_clinical_audit_id,
            "last_business_audit_id": validated.last_business_audit_id,
            "search_vector": validated.search_vector or {},
            "current_snapshot": validated.current_snapshot or {},
            "runtime_metadata": validated.runtime_metadata or {},
            "patient_account_id": validated.patient_account_id,
            "patient_profile_id": validated.patient_profile_id,
            "consultation_id": validated.consultation_id,
            "encounter_id": validated.encounter_id,
            "recommendation_id": validated.recommendation_id,
            "booking_id": validated.booking_id,
            "routing_id": validated.routing_id,
            "report_id": validated.report_id,
            "prescription_id": validated.prescription_id,
            "payment_id": validated.payment_id,
            "invoice_id": validated.invoice_id,
            "laboratory_id": validated.laboratory_id,
            "branch_id": validated.branch_id,
            "provider_reference": validated.provider_reference,
            "whatsapp_message_id": validated.whatsapp_message_id,
            "phone_number": validated.phone_number,
            "order_id": validated.order_id,
            "first_seen_at": validated.first_seen_at,
            "last_seen_at": validated.last_seen_at,
            "identifier_count": validated.identifier_count,
        }

    @classmethod
    def prepare_validated_fields(
        cls,
        *,
        workflow_instance_id: str,
        workflow_type: WorkflowType | str,
        resource_type: BusinessResourceType | str,
        resource_id: str,
        organization_id: str,
        status: TraceStatus | str,
        last_event: str,
        last_source: TraceSource | str,
        sync_status: SyncStatus | str,
        workflow_health: WorkflowHealth | str,
        workflow_depth: int = 0,
        parent_workflow_instance_id: str | None = None,
        correlation_id: str | None = None,
        request_id: str | None = None,
        current_state: str | None = None,
        workflow_step: str | None = None,
        last_sequence_no: int | None = None,
        first_event_at: datetime | None = None,
        last_event_at: datetime | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
        duration_ms: int | None = None,
        retry_count: int = 0,
        last_clinical_audit_id: UUID | None = None,
        last_business_audit_id: UUID | None = None,
        identifiers: dict[str, str] | None = None,
        trace_version: int = TRACE_VERSION_DEFAULT,
        projection_version: int = PROJECTION_VERSION_DEFAULT,
        current_snapshot: dict | None = None,
        first_seen_at: datetime | None = None,
        last_seen_at: datetime | None = None,
        identifier_count: int = 0,
    ) -> dict[str, Any]:
        ctx = cls.get_context()
        resolved = resolve_trace_context(
            workflow_instance_id=workflow_instance_id,
            parent_workflow_instance_id=parent_workflow_instance_id,
            correlation_id=correlation_id,
            request_id=request_id,
            context=ctx,
        )
        corr = cls.resolve_correlation_id(resolved["correlation_id"], context=ctx)
        req_id = cls.resolve_request_id(resolved["request_id"], context=ctx)
        wf_type = WorkflowType(workflow_type) if isinstance(workflow_type, str) else workflow_type
        res_type = (
            BusinessResourceType(resource_type)
            if isinstance(resource_type, str)
            else resource_type
        )
        trace_status = TraceStatus(status) if isinstance(status, str) else status
        source = TraceSource(last_source) if isinstance(last_source, str) else last_source
        sync = SyncStatus(sync_status) if isinstance(sync_status, str) else sync_status
        health = (
            WorkflowHealth(workflow_health)
            if isinstance(workflow_health, str)
            else workflow_health
        )
        merged_ids = merge_identifiers(
            explicit=identifiers,
            context_values=context_identifier_values(ctx),
        )
        fingerprint = compute_workflow_fingerprint(
            workflow_instance_id=str(resolved["workflow_instance_id"]),
            workflow_type=wf_type,
            resource_id=resource_id,
            organization_id=organization_id,
        )
        depth = resolve_workflow_depth(wf_type, explicit_depth=workflow_depth)
        return {
            "correlation_id": corr,
            "request_id": req_id,
            "workflow_instance_id": str(resolved["workflow_instance_id"]),
            "parent_workflow_instance_id": resolved["parent_workflow_instance_id"],
            "workflow_type": wf_type,
            "resource_type": res_type,
            "resource_id": resource_id,
            "organization_id": organization_id,
            "status": trace_status,
            "last_event": last_event,
            "workflow_fingerprint": fingerprint,
            "last_source": source,
            "sync_status": sync,
            "workflow_health": health,
            "workflow_depth": depth,
            "current_state": current_state or "",
            "workflow_step": workflow_step,
            "last_sequence_no": last_sequence_no,
            "first_event_at": first_event_at,
            "last_event_at": last_event_at,
            "started_at": started_at,
            "completed_at": completed_at,
            "duration_ms": duration_ms,
            "retry_count": retry_count,
            "last_clinical_audit_id": last_clinical_audit_id,
            "last_business_audit_id": last_business_audit_id,
            "search_vector": build_search_vector(merged_ids),
            "current_snapshot": current_snapshot or {},
            "trace_version": trace_version,
            "projection_version": projection_version,
            "first_seen_at": first_seen_at,
            "last_seen_at": last_seen_at,
            "identifier_count": identifier_count,
            **merged_ids,
        }
