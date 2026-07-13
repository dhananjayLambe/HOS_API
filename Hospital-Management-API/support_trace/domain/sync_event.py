"""M5.2 synchronization event contract for Support Trace projection."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID

from support_trace.enums import TraceSource, TraceStatus
from support_trace.exceptions import TraceValidationError


@dataclass(frozen=True)
class SupportTraceSyncEvent:
    """ProjectionEvent between immutable audits and ProjectionEngine."""

    workflow_instance_id: str
    workflow_type: str
    resource_type: str
    resource_id: str
    organization_id: str
    last_event: str
    last_sequence_no: int | None
    source: TraceSource
    audit_id: str
    status: str
    action: str = ""
    current_state: str | None = None
    workflow_step: str | None = None
    parent_workflow_instance_id: str | None = None
    workflow_depth: int = 0
    identifiers: dict[str, str] | None = None
    correlation_id: str | None = None
    request_id: str | None = None
    event_at: datetime | None = None
    payload: dict[str, Any] = field(default_factory=dict)

    def validate(self) -> None:
        if not self.workflow_instance_id:
            raise TraceValidationError("workflow_instance_id is required.")
        if not self.organization_id:
            raise TraceValidationError("organization_id is required.")
        if not self.last_event:
            raise TraceValidationError("last_event is required.")
        if self.source not in (TraceSource.CLINICAL_AUDIT, TraceSource.BUSINESS_AUDIT):
            raise TraceValidationError(
                "source must be ClinicalAudit or BusinessAudit for sync events."
            )
        if self.status not in TraceStatus.values:
            raise TraceValidationError(f"Invalid status: {self.status}")

    @property
    def last_clinical_audit_id(self) -> str | None:
        if self.source == TraceSource.CLINICAL_AUDIT:
            return self.audit_id
        return None

    @property
    def last_business_audit_id(self) -> str | None:
        if self.source == TraceSource.BUSINESS_AUDIT:
            return self.audit_id
        return None

    def audit_uuid(self) -> UUID | None:
        try:
            return UUID(str(self.audit_id))
        except (ValueError, TypeError):
            return None

    def to_serializable(self) -> dict[str, Any]:
        """JSON-serializable dict for M5.3 rebuild stubs."""
        data = asdict(self)
        data["source"] = (
            self.source.value if isinstance(self.source, TraceSource) else str(self.source)
        )
        if self.event_at is not None:
            data["event_at"] = self.event_at.isoformat()
        return data

    @classmethod
    def from_serializable(cls, data: dict[str, Any]) -> SupportTraceSyncEvent:
        payload = dict(data)
        source = payload.get("source")
        if isinstance(source, str):
            payload["source"] = TraceSource(source)
        event_at = payload.get("event_at")
        if isinstance(event_at, str):
            payload["event_at"] = datetime.fromisoformat(event_at)
        payload.setdefault("payload", {})
        payload.setdefault("action", payload.get("action") or "")
        return cls(**{k: v for k, v in payload.items() if k in cls.__dataclass_fields__})

    @classmethod
    def from_business_audit(cls, audit: Any) -> SupportTraceSyncEvent:
        from support_trace.workflow.resolvers import (
            IdentifierResolver,
            ParentResolver,
            WorkflowResolver,
        )
        from support_trace.workflow.workflow_status_mapper import map_workflow_status

        resolved = WorkflowResolver.resolve_from_business_audit(audit)
        identifiers = IdentifierResolver.from_business_audit(audit)
        parent, depth = ParentResolver.from_business_audit(audit)
        status = map_workflow_status(getattr(audit, "status", None))
        payload = dict(getattr(audit, "payload", None) or {})
        if getattr(audit, "retry_reason", None):
            payload.setdefault("retry_reason", audit.retry_reason)

        return cls(
            workflow_instance_id=resolved.workflow_instance_id,
            workflow_type=resolved.workflow_type,
            resource_type=resolved.resource_type,
            resource_id=resolved.resource_id,
            organization_id=resolved.organization_id,
            last_event=resolved.last_event,
            last_sequence_no=resolved.last_sequence_no,
            source=TraceSource.BUSINESS_AUDIT,
            audit_id=str(audit.id),
            status=status.value if isinstance(status, TraceStatus) else str(status),
            action=resolved.action,
            parent_workflow_instance_id=parent,
            workflow_depth=depth,
            identifiers=identifiers,
            correlation_id=resolved.correlation_id,
            request_id=resolved.request_id,
            event_at=resolved.event_at,
            payload=payload,
        )

    @classmethod
    def from_clinical_audit(cls, audit: Any) -> SupportTraceSyncEvent:
        from support_trace.workflow.resolvers import (
            IdentifierResolver,
            ParentResolver,
            WorkflowResolver,
        )
        from support_trace.workflow.workflow_status_mapper import map_clinical_outcome

        resolved = WorkflowResolver.resolve_from_clinical_audit(audit)
        identifiers = IdentifierResolver.from_clinical_audit(audit)
        parent, depth = ParentResolver.from_clinical_audit(
            workflow_instance_id=resolved.workflow_instance_id,
            workflow_type=resolved.workflow_type,
            consultation_id=getattr(audit, "consultation_id", None),
        )
        status = map_clinical_outcome(
            getattr(audit, "outcome", None),
            action=resolved.action,
        )
        return cls(
            workflow_instance_id=resolved.workflow_instance_id,
            workflow_type=resolved.workflow_type,
            resource_type=resolved.resource_type,
            resource_id=resolved.resource_id,
            organization_id=resolved.organization_id,
            last_event=resolved.last_event,
            last_sequence_no=None,
            source=TraceSource.CLINICAL_AUDIT,
            audit_id=str(audit.id),
            status=status.value if isinstance(status, TraceStatus) else str(status),
            action=resolved.action,
            parent_workflow_instance_id=parent or resolved.parent_workflow_instance_id,
            workflow_depth=depth,
            identifiers=identifiers,
            correlation_id=resolved.correlation_id,
            event_at=resolved.event_at,
            payload=dict(getattr(audit, "payload", None) or {}),
        )
