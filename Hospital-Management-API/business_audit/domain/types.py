"""Business Audit domain types."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    ExternalProvider,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)


@dataclass(frozen=True)
class ValidatedBusinessAuditRequest:
    action: BusinessAuditAction
    event: str
    workflow_type: WorkflowType
    workflow_instance_id: str
    category: EventCategory
    domain: str
    service: str
    operation: str
    resource_type: BusinessResourceType
    resource_id: str
    organization_id: str
    status: WorkflowStatus
    outcome: WorkflowOutcome
    actor_type: ActorType
    parent_workflow_instance_id: str | None = None
    sequence_no: int | None = None
    state_before: str | None = None
    state_after: str | None = None
    user_id: str | None = None
    payload: dict | None = None
    correlation_id: str | None = None
    request_id: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    execution_time_ms: int | None = None
    retry_count: int = 0
    max_retry: int | None = None
    retry_reason: str | None = None
    external_provider: ExternalProvider | None = None
    provider_reference: str | None = None
    provider_response_code: str | None = None
    provider_response_message: str | None = None
    tenant: str | None = None
    environment: str | None = None
    deployment: str | None = None
    remarks: str | None = None
    occurred_at: datetime | None = None


@dataclass(frozen=True)
class BusinessAuditResult:
    success: bool
    correlation_id: str
    workflow_instance_id: str
    sequence_no: int | None = None
    audit_id: UUID | None = None
    error: str | None = None
    error_type: str | None = None
