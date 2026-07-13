"""Support Trace domain types."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.enums import SyncStatus, TraceSource, TraceStatus, WorkflowHealth


@dataclass(frozen=True)
class ValidatedSupportTraceRequest:
    correlation_id: str
    workflow_instance_id: str
    workflow_type: WorkflowType
    resource_type: BusinessResourceType
    resource_id: str
    organization_id: str
    status: TraceStatus
    last_event: str
    workflow_fingerprint: str
    last_source: TraceSource
    sync_status: SyncStatus
    workflow_health: WorkflowHealth
    workflow_depth: int = 0
    parent_workflow_instance_id: str | None = None
    request_id: str | None = None
    current_state: str = ""
    workflow_step: str | None = None
    last_sequence_no: int | None = None
    first_event_at: datetime | None = None
    last_event_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int | None = None
    retry_count: int = 0
    last_clinical_audit_id: UUID | None = None
    last_business_audit_id: UUID | None = None
    search_vector: dict | None = None
    current_snapshot: dict | None = None
    trace_version: int = 1
    projection_version: int = 1
    patient_account_id: str | None = None
    patient_profile_id: str | None = None
    consultation_id: str | None = None
    encounter_id: str | None = None
    recommendation_id: str | None = None
    booking_id: str | None = None
    routing_id: str | None = None
    report_id: str | None = None
    prescription_id: str | None = None
    payment_id: str | None = None
    invoice_id: str | None = None
    laboratory_id: str | None = None
    branch_id: str | None = None
    provider_reference: str | None = None
    whatsapp_message_id: str | None = None
    phone_number: str | None = None
    order_id: str | None = None
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None
    identifier_count: int = 0
    runtime_metadata: dict | None = None


@dataclass(frozen=True)
class SupportTraceResult:
    success: bool
    correlation_id: str
    workflow_instance_id: str | None = None
    trace_id: UUID | None = None
    trace_version: int | None = None
    sync_status: str | None = None
    created: bool = False
    error: str | None = None
    error_type: str | None = None
