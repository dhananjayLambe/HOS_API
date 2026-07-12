---
owner: clinical-audit-team
module: clinical_audit
version: 1.0
last_updated: 2026-07-12
status: approved
---

# Clinical Audit Certification (M3.7)

Production-readiness certification for the Clinical Audit framework (M3.2–M3.6). This milestone validates existing audit records — it does **not** add new audit events or business integrations.

## Architecture

```
Clinical Workflow (E2E tests)
        │
        ▼
Business Services (M3.3–M3.6)
        │
        ▼
ClinicalAuditService → ClinicalAudit table
        │
        ▼
ClinicalAuditCertificationService
        ├── TimelineValidator
        ├── CorrelationValidator
        ├── PayloadValidator
        ├── ImmutabilityValidator
        └── PerformanceValidator (optional)
        │
        ▼
CertificationReport (pass/fail per category)
```

## Canonical certification journey

Thirteen wired production events:

1. `vitals.recorded` (pre-consultation)
2. `consultation.started`
3. `test.ordered`
4. `recommendation.sent`
5. `report.uploaded`
6. `report.viewed`
7. `report.downloaded`
8. `report.shared`
9. `symptoms.recorded`
10. `diagnosis.added`
11. `prescription.created`
12. `prescription.signed`
13. `consultation.completed`

`patient.record_created` is defined in enums but has no production wiring — documented as deferred in the certification checklist.

## Running certification

### Full test suite (release gate)

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest clinical_audit/tests -v
```

### Certification tests only

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest \
  clinical_audit/tests/test_patient_workflow.py \
  clinical_audit/tests/test_certification.py \
  clinical_audit/tests/test_timeline_validation.py \
  clinical_audit/tests/test_correlation_validation.py \
  clinical_audit/tests/test_payload_validation.py \
  clinical_audit/tests/test_performance.py \
  -v
```

### Programmatic certification

```python
from clinical_audit.certification import ClinicalAuditCertificationService

report = ClinicalAuditCertificationService().certify(
    correlation_id="<workflow-correlation-id>",
    consultation_id="<consultation-id>",
    patient_account_id="<patient-account-id>",
)
assert report.passed, report.errors
print(report.to_dict())
```

## CertificationReport

| Field | Description |
|---|---|
| `passed` | True when all validators pass |
| `correlation_id` | Workflow correlation scope |
| `consultation_id` | Resolved consultation identifier |
| `event_count` | Count of certification-journey events |
| `timeline` | Ordered audit rows (action, timestamp, resource) |
| `validators` | Per-category pass/fail with errors and metrics |
| `duration_ms` | Certification runtime |

## Validators

| Validator | Checks |
|---|---|
| **Timeline** | 13 required events, no duplicates, tier/pairwise ordering, first/last events |
| **Correlation** | Single non-empty `correlation_id` across all rows |
| **Payload** | Required metadata, forbidden keys, snapshot rules |
| **Immutability** | Model/queryset/repository append-only enforcement |
| **Performance** | Timeline load &lt;200ms, certification &lt;500ms, write &lt;30ms (optional) |

## Fixtures

Deterministic metadata under `clinical_audit/fixtures/`:

- `certification_expected_timeline.json`
- `certification_patient.json`
- `certification_consultation.json`
- `certification_prescription.json`
- `certification_reports.json`

## Related documents

- [CERTIFICATION_CHECKLIST.md](CERTIFICATION_CHECKLIST.md) — release gate checklist
- [SAMPLE_PATIENT_TIMELINE.md](SAMPLE_PATIENT_TIMELINE.md) — example timeline and row fields
