---
owner: clinical-audit-team
module: clinical_audit
version: 1.4
last_updated: 2026-07-12
status: approved
---

# clinical_audit Documentation

Permanent, immutable EMR audit trail for DoctorProCare patient-care actions.

**Milestone 3.1 — Foundation:** domain model and PostgreSQL schema.

**Milestone 3.2 — Service:** centralized `ClinicalAuditService.record()` write path (fail-open).

**Milestone 3.3 — Consultation Audit:** first module integration via `consultations_core/audit/`.

**Milestone 3.4 — Clinical Documentation Audit:** diagnosis, allergy, vitals, symptoms via `clinical_documentation/audit/`.

**Milestone 3.5 — Prescription & Recommendation Audit:** prescription lifecycle and diagnostic recommendations via `consultations_core/audit/prescription/`.

**Milestone 3.6 — Diagnostic & Report Audit:** test ordering and report lifecycle via `diagnostics_engine/audit/`.

**Milestone 3.7 — Certification:** validation and production-readiness certification via `clinical_audit/certification/`.

Application logs (Phase 1–2) are operational and temporary. Clinical Audit records are part of the patient’s legal medical history and must never be rewritten or deleted.

## Index

| Document | Description |
|---|---|
| [HOW_TO_USE.md](HOW_TO_USE.md) | **Start here** — examples, required fields, correlation, integration patterns |
| [AUDIT_EVENTS.md](AUDIT_EVENTS.md) | Platform event catalogue (payload schemas, actors, examples) |
| [CONSULTATION_AUDIT.md](CONSULTATION_AUDIT.md) | M3.3 consultation integration (reference implementation) |
| [CLINICAL_DOCUMENTATION_AUDIT.md](CLINICAL_DOCUMENTATION_AUDIT.md) | M3.4 clinical documentation integration |
| [PRESCRIPTION_AUDIT.md](PRESCRIPTION_AUDIT.md) | M3.5 prescription and recommendation integration |
| [DIAGNOSTIC_AUDIT.md](DIAGNOSTIC_AUDIT.md) | M3.6 diagnostic test and report integration |
| [CERTIFICATION.md](CERTIFICATION.md) | M3.7 certification validators and release gate |
| [CERTIFICATION_CHECKLIST.md](CERTIFICATION_CHECKLIST.md) | M3.7 production-readiness checklist |
| [SAMPLE_PATIENT_TIMELINE.md](SAMPLE_PATIENT_TIMELINE.md) | M3.7 canonical patient journey reference |
| [MODELS.md](MODELS.md) | ClinicalAudit schema, enums, indexes, immutability |
| [SERVICE.md](SERVICE.md) | M3.2 service API, validation, correlation, failure isolation |

## App layout

```
clinical_audit/
├── certification/          # M3.7 validators + certification service
├── fixtures/               # M3.7 certification datasets
├── domain/
│   ├── snapshots/          # platform snapshot builders
│   ├── validators.py
│   ├── builders.py
│   └── ...
├── services/
│   └── clinical_audit_service.py
└── ...

consultations_core/audit/    # M3.3 module integration (reference pattern)
    consultation_audit_service.py
    payload_builder.py
    statistics_builder.py
    prescription/              # M3.5 prescription & recommendation audit
        prescription_audit_service.py
        hooks.py

clinical_documentation/audit/  # M3.4 clinical documentation audit
    clinical_documentation_audit_service.py
    payload_builder.py
    snapshot_builder.py
    hooks.py

diagnostics_engine/audit/      # M3.6 diagnostic & report audit
    diagnostic_audit_service.py
    hooks.py
    test_payload_builder.py
    report_payload_builder.py
```

## Usage (M3.3 — consultation)

Business modules use a thin module facade, not `ClinicalAuditService` directly:

```python
from consultations_core.audit import ConsultationAuditService, emit_after_commit

emit_after_commit(
    ConsultationAuditService.emit_completed,
    encounter, consultation, user,
    completion_source="doctor",
)
```

See [CONSULTATION_AUDIT.md](CONSULTATION_AUDIT.md), [CLINICAL_DOCUMENTATION_AUDIT.md](CLINICAL_DOCUMENTATION_AUDIT.md), [PRESCRIPTION_AUDIT.md](PRESCRIPTION_AUDIT.md), and [DIAGNOSTIC_AUDIT.md](DIAGNOSTIC_AUDIT.md).

## Usage (M3.4 — clinical documentation)

```python
from consultations_core.audit import emit_after_commit
from clinical_documentation.audit import schedule_diagnosis_audit

schedule_diagnosis_audit(
    consultation=consultation,
    user=user,
    diagnosis_row=row,
    prior_state=prior_state,
    is_create=is_create,
)
```

## Usage (M3.5 — prescription & recommendation)

```python
from consultations_core.audit import (
    schedule_prescription_created,
    schedule_prescription_signed,
    schedule_prescription_downloaded,
    schedule_recommendation_generated,
)

schedule_prescription_created(consultation=consultation, user=user, prescription=rx)
schedule_prescription_signed(consultation=consultation, user=user, prescription=rx)
schedule_prescription_downloaded(prescription=rx, request=request)
schedule_recommendation_generated(
    consultation=consultation,
    user=user,
    recommendation_id=recommendation_id,
    result=result,
)
```

## Usage (M3.6 — diagnostic & report)

```python
from diagnostics_engine.audit import (
    schedule_test_ordered,
    schedule_test_recommendation_sent,
    schedule_report_uploaded,
    schedule_report_viewed,
    schedule_report_downloaded,
    schedule_report_shared,
)

schedule_test_ordered(order=order, user=user)
schedule_test_recommendation_sent(message=message)
schedule_report_uploaded(report=report, user=user, artifacts=created)
schedule_report_viewed(report=report, user=request.user)
schedule_report_downloaded(report=report, user=request.user)
schedule_report_shared(report=report, user=request.user, channel="WHATSAPP")
```

## Coexistence with `consultations_core.ClinicalAuditLog`

`consultations_core.models.audit.ClinicalAuditLog` remains the **field-level lifecycle** log. It is **not** removed in M3.3.

## Not yet implemented

- Logger / CloudWatch dual-write (M3.9)
- Clinical notes API wiring (M3.4 facade ready)
- Prescription updated / recommendation accepted production wiring (M3.5 facade ready)
- Investigation item POST audit (`investigation.added`)
- Query / timeline APIs (M3.7)

## Tests

```bash
DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest clinical_audit/tests -v
```

178 tests including consultation, clinical documentation, prescription, and diagnostic audit coverage.
