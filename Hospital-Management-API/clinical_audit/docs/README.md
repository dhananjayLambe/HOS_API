---
owner: clinical-audit-team
module: clinical_audit
version: 1.1
last_updated: 2026-07-09
status: approved
---

# clinical_audit Documentation

Permanent, immutable EMR audit trail for DoctorProCare patient-care actions.

**Milestone 3.1 — Foundation:** domain model and PostgreSQL schema.

**Milestone 3.2 — Service:** centralized `ClinicalAuditService.record()` write path (fail-open).

Application logs (Phase 1–2) are operational and temporary. Clinical Audit records are part of the patient’s legal medical history and must never be rewritten or deleted.

## Index

| Document | Description |
|---|---|
| [HOW_TO_USE.md](HOW_TO_USE.md) | **Start here** — examples, required fields, correlation, integration patterns |
| [MODELS.md](MODELS.md) | ClinicalAudit schema, enums, indexes, immutability |
| [SERVICE.md](SERVICE.md) | Service API, validation, correlation, failure isolation |

## App layout

```
clinical_audit/
├── apps.py
├── admin.py
├── constants.py
├── enums.py
├── exceptions.py
├── models/
│   ├── __init__.py
│   └── audit.py          # ClinicalAudit
├── domain/
│   ├── types.py          # ValidatedAuditRequest, AuditRecordResult
│   ├── validators.py
│   ├── builders.py
│   ├── repository.py
│   └── utils.py
├── services/
│   └── clinical_audit_service.py
├── api/                  # reserved (later milestones)
├── migrations/
├── tests/
└── docs/
```

## Usage (M3.2)

Quick start — see **[HOW_TO_USE.md](HOW_TO_USE.md)** for the full guide.

```python
from clinical_audit.services import ClinicalAuditService
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity

result = ClinicalAuditService.record(
    action=AuditAction.CONSULTATION_STARTED,
    event="Consultation started",
    resource_type=ClinicalEntity.CONSULTATION,
    resource_id=str(consultation_id),
    source=AuditSource.DOCTOR,
    user_id=str(user_id),
    organization_id=str(clinic_id),
    payload={"status": "started"},
)
```

See [SERVICE.md](SERVICE.md) for architecture and [HOW_TO_USE.md](HOW_TO_USE.md) for integration patterns, correlation IDs, and result handling.

## Coexistence with `consultations_core.ClinicalAuditLog`

`consultations_core.models.audit.ClinicalAuditLog` remains the **field-level lifecycle** log (status transitions on encounters/consultations). It is **not** migrated or removed in M3.1/M3.2.

| Concern | `consultations_core.ClinicalAuditLog` | `clinical_audit.ClinicalAudit` |
|---------|--------------------------------------|--------------------------------|
| Scope | Field change on one object | Platform-wide clinical action |
| Correlation ID | No | Required |
| Patient / consultation context | No | Yes |
| Purpose | Lifecycle / status history | Permanent EMR audit trail |

## Not yet implemented

- Logger / CloudWatch dual-write (M3.3)
- Domain instrumentation from clinical workflows (M3.4–M3.5)
- Query / timeline APIs (M3.6)

## Tests

```bash
DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest clinical_audit/tests -v
```
