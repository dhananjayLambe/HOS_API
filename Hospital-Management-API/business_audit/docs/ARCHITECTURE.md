# Business Audit Architecture

## Platform layers

```
Module facades (M4.2+)
        ↓
BusinessAuditService.record()   ← fail-open public API
        ↓
Validator → Builder → Repository
        ↓
BusinessAudit (immutable table)
```

Shared infrastructure lives in `shared/audit/`:

| Module | Responsibility |
|---|---|
| `envelope.py` | `_meta` + `payload` envelope with `schema_version`, `builder_version` |
| `sanitization.py` | Forbidden keys, payload size limits |
| `immutability.py` | Append-only queryset patterns |
| `base_validator.py` | UUID, JSON, size validation |
| `base_builder.py` | Context merge, envelope assembly |
| `base_repository.py` | Append-only save/bulk_save |
| `base_service.py` | Fail-open orchestration template |

Clinical Audit (M3.x) imports envelope and sanitization from `shared/audit/` without behavioral change.

## vs Clinical Audit

| Dimension | Clinical Audit | Business Audit |
|---|---|---|
| Primary grouping | Patient / consultation | `workflow_instance_id` |
| State model | `previous_value` / `new_value` snapshots | `state_before` / `state_after` transitions |
| Termination | `outcome` only | `status` (lifecycle) + `outcome` (result) |
| Observability | `module` | `domain` / `service` / `operation` |
| Volume | Lower (legal EMR) | Higher (operational) |

Both share `correlation_id` for end-to-end patient journey tracing.

## Write path

1. Caller invokes `BusinessAuditService.record()` with workflow and resource context.
2. `BusinessAuditRequestValidator` normalizes enums, validates UUIDs, sanitizes payload.
3. `BusinessAuditBuilder` merges `LogContext`, assigns `sequence_no`, builds envelope.
4. `BusinessAuditRepository.save()` persists append-only row.
5. On any error, service logs a warning and returns `BusinessAuditResult(success=False)` unless `raise_on_failure=True`.

## Immutability

Records cannot be updated or deleted at the model or queryset level. Corrections are new audit events, never mutations.
