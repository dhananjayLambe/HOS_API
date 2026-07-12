---
owner: clinical-audit-team
module: clinical_audit
version: 1.0
last_updated: 2026-07-12
status: approved
---

# Consultation Audit Integration (M3.3)

First business-module consumer of the centralized Clinical Audit framework. Serves as the reference pattern for Prescription, Diagnosis, Reports, and future modules.

## Architecture

```
Consultation API / Service
        │
        ▼
consultations_core/audit/ConsultationAuditService  (thin facade)
        │
        ├── ConsultationAuditPayloadBuilder
        ├── ConsultationStatisticsBuilder
        └── clinical_audit/domain/snapshots/consultation_snapshot.py
        │
        ▼
ClinicalAuditService.record()  (M3.2)
        │
        ▼
PostgreSQL clinical_audit
```

## Package layout

```
consultations_core/audit/
    consultation_audit_service.py   # translate → map → delegate (~200 lines)
    payload_builder.py
    statistics_builder.py
    constants.py
    commit.py                         # transaction.on_commit helper
```

Future modules follow the same pattern: `prescriptions/audit/`, `diagnosis/audit/`, etc.

## Event ordering (critical)

Audit is emitted **only after successful business persistence**:

```python
from consultations_core.audit import ConsultationAuditService, emit_after_commit

emit_after_commit(
    ConsultationAuditService.emit_completed,
    encounter, consultation, user,
    completion_source="doctor",
)
```

`emit_after_commit` captures `correlation_id` from active `LogContext` at schedule time so it survives request teardown.

Never emit audit before the business transaction commits — otherwise timelines can show `completed` for rolled-back work.

## Integration points

| Operation | Location | Event |
|---|---|---|
| Start consultation | `consultation_start_service.py` | `consultation.started` |
| Complete consultation | `EndConsultationAPIView` | `consultation.completed` |
| Cancel encounter | `CancelEncounterAPIView` | `consultation.cancelled` |
| PATCH findings | `findings.py` | `consultation.findings.updated` |
| PATCH instructions | `instructions.py` | `consultation.instructions.updated` |
| PATCH investigations | `investigations.py` | `consultation.investigations.updated` |

## Idempotency

| Event | Guard |
|---|---|
| `consultation.started` | Skip when `already_started=True` |
| `consultation.completed` | Skip if audit row exists for resource + action |
| `consultation.cancelled` | Skip if audit row exists for resource + action |
| Section updates | Each save is a distinct event |

Protects against client retries after timeouts.

## Granular section events

Section saves emit specific actions (not generic `consultation.updated`) for readable M3.6 timelines:

```
Started → Findings Updated → Instructions Updated → Completed
```

See [AUDIT_EVENTS.md](AUDIT_EVENTS.md) for payload schemas.

## Reopen

`emit_reopened()` is implemented and unit-tested. **No API or state-machine wiring** until reopen business flow is built.

## Coexistence

Legacy `consultations_core.domain.audit.AuditService` → `ClinicalAuditLog` remains unchanged. Both systems run in parallel during migration.

## Tests

```bash
DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest \
  clinical_audit/tests/test_consultation_audit.py \
  clinical_audit/tests/test_consultation_audit_integration.py -v
```

## Related

- [AUDIT_EVENTS.md](AUDIT_EVENTS.md) — event catalogue
- [HOW_TO_USE.md](HOW_TO_USE.md) — module integration pattern
- [SERVICE.md](SERVICE.md) — M3.2 framework
