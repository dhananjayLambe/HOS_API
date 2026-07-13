"""Domain types for the Workflow State Engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from support_trace.enums import TraceStatus


@dataclass(frozen=True)
class WorkflowStateTransition:
    """Mapped outcome of an audit action for projection."""

    current_state: str
    workflow_step: str
    trace_status: TraceStatus
    increment_retry: bool = False
    finalize_duration: bool = False
    allow_regression: bool = False
    snapshot_patch: dict[str, Any] | None = None


@dataclass(frozen=True)
class ResolvedWorkflow:
    """Identity resolved from an audit row / SyncEvent."""

    workflow_instance_id: str
    workflow_type: str
    resource_type: str
    resource_id: str
    organization_id: str
    parent_workflow_instance_id: str | None = None
    workflow_depth: int = 0
    action: str = ""
    last_event: str = ""
    correlation_id: str | None = None
    request_id: str | None = None
    last_sequence_no: int | None = None
    event_at: datetime | None = None
    identifiers: dict[str, str] = field(default_factory=dict)
    payload: dict[str, Any] = field(default_factory=dict)
    identifier_count: int = 0
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None


@dataclass(frozen=True)
class WorkflowStateUpdate:
    """Prepared update for WorkflowStateService."""

    resolved: ResolvedWorkflow
    transition: WorkflowStateTransition
    last_clinical_audit_id: str | None = None
    last_business_audit_id: str | None = None
    last_source: str = "System"
