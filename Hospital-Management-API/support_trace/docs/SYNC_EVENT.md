# SupportTraceSyncEvent Contract

M5.2 audit sync hooks emit `SupportTraceSyncEvent` instances. M5.1 defines the contract and a stub consumer (`ProjectionEngine`).

## Dataclass

```python
@dataclass(frozen=True)
class SupportTraceSyncEvent:
    workflow_instance_id: str
    workflow_type: str
    resource_type: str
    resource_id: str
    organization_id: str
    last_event: str
    last_sequence_no: int | None
    source: TraceSource          # ClinicalAudit | BusinessAudit only
    audit_id: str                # UUID of source audit record
    status: str                  # TraceStatus value
    current_state: str | None = None
    workflow_step: str | None = None
    parent_workflow_instance_id: str | None = None
    workflow_depth: int = 0
    identifiers: dict[str, str] | None = None
    correlation_id: str | None = None
    request_id: str | None = None
    event_at: datetime | None = None
```

Defined in `domain/sync_event.py`.

## Validation rules

`event.validate()` enforces:

- `workflow_instance_id`, `organization_id`, `last_event` are non-empty
- `source` must be `ClinicalAudit` or `BusinessAudit` (not `Manual` / `System`)
- `status` must be a valid `TraceStatus` value

## Audit reference mapping

| `source` | Sets |
|----------|------|
| `ClinicalAudit` | `last_clinical_audit_id = audit_id` |
| `BusinessAudit` | `last_business_audit_id = audit_id` |

`ProjectionEngine.project()` parses `audit_id` as UUID and passes the appropriate field to `SupportTraceService.record()`.

## M5.2 flow (not built in M5.1)

```
ClinicalAuditService.record() ──► on_commit hook ──► SupportTraceSyncEvent
BusinessAuditService.record() ──► on_commit hook ──► SupportTraceSyncEvent
                                                          │
                                                          ▼
                                                  ProjectionEngine.project()
                                                          │
                                                          ▼
                                                  SupportTraceService.record()
```

M5.1 delivers:

- `SupportTraceSyncEvent` dataclass with validation
- `ProjectionEngine.project()` stub that delegates to the service
- Tests proving clinical and business audit references are set correctly

## Example — Business Audit sync (M5.2 target)

```python
from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.enums import TraceSource, TraceStatus
from support_trace.services.projection_engine import ProjectionEngine

event = SupportTraceSyncEvent(
    workflow_instance_id=audit.workflow_instance_id,
    workflow_type=audit.workflow_type,
    resource_type=audit.resource_type,
    resource_id=audit.resource_id,
    organization_id=audit.organization_id,
    last_event=audit.event,
    last_sequence_no=audit.sequence_no,
    source=TraceSource.BUSINESS_AUDIT,
    audit_id=str(audit.id),
    status=TraceStatus.RUNNING,
    current_state=audit.status,
    workflow_step=audit.operation,
    parent_workflow_instance_id=audit.parent_workflow_instance_id,
    correlation_id=audit.correlation_id,
    request_id=audit.request_id,
    event_at=audit.created_at,
    identifiers={"booking_id": audit.resource_id},
)

ProjectionEngine.project(event)
```

## Example — Clinical Audit sync (M5.2 target)

```python
event = SupportTraceSyncEvent(
    workflow_instance_id=workflow_instance_id,
    workflow_type=WorkflowType.CONSULTATION,
    resource_type=BusinessResourceType.CONSULTATION,
    resource_id=str(consultation.id),
    organization_id=str(clinic.id),
    last_event="consultation.started",
    last_sequence_no=None,
    source=TraceSource.CLINICAL_AUDIT,
    audit_id=str(clinical_audit.id),
    status=TraceStatus.RUNNING,
    correlation_id=clinical_audit.correlation_id,
    identifiers={"consultation_id": str(consultation.id)},
)

ProjectionEngine.project(event)
```

## Error handling

- `ProjectionEngine.project(raise_on_failure=True)` propagates validation and repository errors.
- Default (`raise_on_failure=False`) follows the fail-open pattern via `SupportTraceService`.
