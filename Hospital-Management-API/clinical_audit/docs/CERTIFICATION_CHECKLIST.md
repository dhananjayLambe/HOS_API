---
owner: clinical-audit-team
module: clinical_audit
version: 1.0
last_updated: 2026-07-12
status: approved
---

# Clinical Audit Certification Checklist

Use this checklist as the release gate before wider rollout of the Clinical Audit subsystem.

## Framework (M3.2)

- [x] `ClinicalAudit` model is insert-only
- [x] `ClinicalAuditService.record()` is fail-open
- [x] Payload sanitization blocks secrets, tokens, binary content
- [x] Correlation ID required on every row

## Consultation audit (M3.3)

- [x] `consultation.started` wired on new consultation create
- [x] `consultation.completed` wired on end consultation
- [x] Idempotency on duplicate complete
- [x] Failure isolation — business succeeds when audit fails
- [x] Integration tests in `test_consultation_audit_integration.py`

## Clinical documentation audit (M3.4)

- [x] `symptoms.recorded`, `vitals.recorded`, `diagnosis.added` wired
- [x] Update events store snapshots (`diagnosis.updated`, `allergy.updated`)
- [x] Failure isolation covered
- [x] Integration tests in `test_clinical_documentation_audit_integration.py`

## Prescription audit (M3.5)

- [x] `prescription.created`, `prescription.signed` wired on end consultation
- [x] `recommendation.generated` wired (marketplace — excluded from canonical E2E)
- [x] Failure isolation covered
- [x] Integration tests in `test_prescription_audit_integration.py`

## Diagnostic & report audit (M3.6)

- [x] `test.ordered`, `recommendation.sent` wired
- [x] `report.uploaded`, `report.viewed`, `report.downloaded`, `report.shared` wired
- [x] Failure isolation covered
- [x] Integration tests in `test_diagnostic_audit_integration.py`

## Certification (M3.7)

- [x] `ClinicalAuditCertificationService` implemented
- [x] Timeline, correlation, payload, immutability validators
- [x] Performance validator with documented targets
- [x] Canonical 13-event E2E workflow (`test_patient_workflow.py`)
- [x] Certification fixtures under `clinical_audit/fixtures/`
- [x] Documentation complete

## Deferred (not blocking M3.7)

- [ ] `patient.record_created` — enum defined, production wiring pending
- [ ] Query / timeline APIs (M3.8)
- [ ] Logger dual-write / CloudWatch (M3.9)
- [ ] Business Audit validation
- [ ] External compliance certification

## Pre-release verification

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest clinical_audit/tests -v
```

All tests must pass. Certification E2E must produce exactly 13 journey events with a single `correlation_id`.

## Sign-off criteria

| Criterion | Target |
|---|---|
| Integration tests | All passing |
| Certification E2E | 13 events, single correlation |
| Immutability | Update/delete blocked |
| Payload security | No forbidden keys in stored payloads |
| Timeline reconstruction | &lt;200ms (13 rows) |
| Certification runtime | &lt;500ms |
