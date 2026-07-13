# SupportTraceService

Centralized, fail-open API for mutable support trace projections.

## `record()`

```python
SupportTraceService.record(
    *,
    workflow_instance_id: str,
    workflow_type: WorkflowType | str,
    resource_type: BusinessResourceType | str,
    resource_id: str,
    organization_id: str,
    status: TraceStatus | str,
    last_event: str,
    last_source: TraceSource | str = TraceSource.SYSTEM,
    workflow_step: str | None = None,
    current_state: str | None = None,
    last_sequence_no: int | None = None,
    parent_workflow_instance_id: str | None = None,
    workflow_depth: int = 0,
    identifiers: dict[str, str] | None = None,
    correlation_id: str | None = None,
    request_id: str | None = None,
    event_at: datetime | None = None,
    completed_at: datetime | None = None,
    retry_count: int = 0,
    last_clinical_audit_id: UUID | None = None,
    last_business_audit_id: UUID | None = None,
    validate_references: bool = True,
    raise_on_failure: bool = False,
) -> SupportTraceResult
```

## Return type

```python
@dataclass
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
```

## Write path

1. Load existing trace by `workflow_instance_id` (if any).
2. Compute `duration_ms` (service only — on `Completed`).
3. Derive `workflow_health` from `status` and `sync_status`.
4. `SupportTraceBuilder.prepare_validated_fields()` — normalize, merge context, fingerprint.
5. `SupportTraceRequestValidator.validate()` — required fields, monotonicity, terminal guard.
6. `SupportTraceBuilder.build()` — final field dict.
7. `SupportTraceRepository.upsert()` — `select_for_update` + `trace_version` check.
8. On `SupportTraceConcurrencyError`: retry upsert once without expected version.
9. `apply_trace_context()` — update `LogContext`.

## Business rules (service-owned)

| Rule | Where |
|------|-------|
| `duration_ms` on terminal `Completed` | `_compute_duration_ms()` |
| `workflow_health` derivation | `_derive_workflow_health()` |
| `sync_status = Indexed` on success | `prepare_validated_fields()` |
| `first_event_at` preserved on update | Uses existing row value |
| `started_at` preserved on update | Uses existing row value |

The builder does **not** set `duration_ms` or `workflow_health`.

## Fail-open behavior

Inherited from `BaseAuditService`:

- Validation failures log to `support_trace_record_failed` and return `success=False`.
- Unexpected exceptions return `SupportTraceResult(sync_status=Failed)`.
- `raise_on_failure=True` propagates `SupportTraceError` for test and admin tooling.

## Concurrency retry

```python
try:
    trace, created = repo.upsert(fields, expected_trace_version=existing.trace_version)
except SupportTraceConcurrencyError:
    trace, created = repo.upsert(fields)  # retry without version check
```

## When to call directly

| Context | Caller |
|---------|--------|
| M5.1 tests | `SupportTraceService.record()` |
| M5.2+ production | `ProjectionEngine.project(SupportTraceSyncEvent)` only |
| Manual admin repair | `record(last_source=TraceSource.MANUAL)` — future M5.3 |

## Example

```python
from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.enums import TraceStatus, TraceSource
from support_trace.services import SupportTraceService

result = SupportTraceService.record(
    workflow_instance_id="wf-booking-abc",
    workflow_type=WorkflowType.BOOKING,
    resource_type=BusinessResourceType.BOOKING,
    resource_id="ORD-456",
    organization_id=str(clinic.id),
    status=TraceStatus.COMPLETED,
    last_event="booking.closed",
    last_source=TraceSource.BUSINESS_AUDIT,
    last_sequence_no=5,
    correlation_id="corr-xyz",
    identifiers={"booking_id": "ORD-456"},
    completed_at=datetime.now(timezone.utc),
)

if result.success:
    print(f"Indexed trace {result.trace_id} v{result.trace_version}")
```
