---
owner: clinical-audit-team
module: clinical_audit
version: 1.0
last_updated: 2026-07-09
status: approved
---

# How to Use Clinical Audit Service

This guide shows how business modules record immutable clinical audit events through the centralized service introduced in M3.2.

## Rule

**Always** call `ClinicalAuditService.record()`. **Never** create `ClinicalAudit` rows directly (`ClinicalAudit.objects.create(...)`) from business code.

Audit recording is **fail-open**: a failed audit write must not roll back or block the clinical transaction. Check `result.success` if you need to react locally; do not raise on audit failure in production flows.

---

## Minimal example

Use this pattern after a successful clinical action (e.g. consultation started):

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

if result.success:
    # optional: use result.audit_id or result.correlation_id for tracing
    pass
```

### Required parameters

| Parameter | Description |
|---|---|
| `action` | Closed vocabulary from `AuditAction` (e.g. `consultation.started`) |
| `event` | Short human-readable summary shown in audit timelines |
| `resource_type` | Entity type from `ClinicalEntity` |
| `resource_id` | String ID of the affected resource |
| `source` | Who performed the action (`AuditSource`: doctor, system, patient, …) |
| `user_id` | String ID of the acting user |
| `organization_id` | Clinic UUID (`str(clinic_id)`) — validated against `clinic.Clinic` |

### Commonly optional parameters

| Parameter | When to pass |
|---|---|
| `payload` | Business context to store with the event (dict, JSON-serializable) |
| `snapshot` | State **before** the change (maps to `previous_value`) |
| `patient_account_id` / `patient_profile_id` | When patient context is known |
| `consultation_id` / `encounter_id` | When tied to an active visit |
| `correlation_id` | To link multiple events in one workflow (see below) |
| `user_role` | Actor role if not already in `LogContext` |
| `service_name` | Originating module name (e.g. `"consultations_core"`) |
| `remarks` | Free-text note for investigators |

`module` is derived automatically from `action` (`consultation.started` → `consultation`) unless you pass it explicitly.

---

## Full example (consultation workflow)

```python
from clinical_audit.services import ClinicalAuditService, AuditRecordResult
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity

def on_consultation_started(
    *,
    consultation_id,
    encounter_id,
    patient_account_id,
    patient_profile_id,
    user_id,
    user_role,
    clinic_id,
    correlation_id=None,
) -> AuditRecordResult:
    return ClinicalAuditService.record(
        action=AuditAction.CONSULTATION_STARTED,
        event="Consultation started",
        resource_type=ClinicalEntity.CONSULTATION,
        resource_id=str(consultation_id),
        source=AuditSource.DOCTOR,
        user_id=str(user_id),
        user_role=user_role,
        organization_id=str(clinic_id),
        patient_account_id=str(patient_account_id),
        patient_profile_id=str(patient_profile_id),
        consultation_id=str(consultation_id),
        encounter_id=str(encounter_id),
        payload={"status": "started"},
        correlation_id=correlation_id,
        service_name="consultations_core",
    )
```

Call this **after** the main business logic succeeds (DB save, state transition, etc.), not before.

---

## Correlation ID (multi-step workflows)

Events in the same workflow should share one `correlation_id` so investigators can reconstruct the full timeline.

```python
# Step 1 — start consultation
result = ClinicalAuditService.record(
    action=AuditAction.CONSULTATION_STARTED,
    event="Consultation started",
    resource_type=ClinicalEntity.CONSULTATION,
    resource_id=str(consultation_id),
    source=AuditSource.DOCTOR,
    user_id=str(user_id),
    organization_id=str(clinic_id),
    correlation_id=correlation_id,  # from request header or LogContext
)

# Step 2 — later in same workflow, reuse correlation_id
ClinicalAuditService.record(
    action=AuditAction.PRESCRIPTION_GENERATED,
    event="Prescription generated",
    resource_type=ClinicalEntity.PRESCRIPTION,
    resource_id=str(prescription_id),
    source=AuditSource.DOCTOR,
    user_id=str(user_id),
    organization_id=str(clinic_id),
    correlation_id=result.correlation_id,
    payload={"prescription_id": str(prescription_id)},
)
```

**Resolution order** when `correlation_id` is omitted:

1. Argument you pass to `record()`
2. Active `LogContext` (set by `CorrelationMiddleware` on HTTP requests)
3. New UUID generated by the service

---

## Handling the result

```python
result = ClinicalAuditService.record(...)

if result.success:
    audit_id = result.audit_id          # UUID of persisted row
    correlation_id = result.correlation_id
else:
    # Audit failed — clinical flow should continue
    # Failure is already logged server-side
    error = result.error                # e.g. "organization_id not found: ..."
    error_type = result.error_type      # e.g. "AuditValidationError"
```

Do **not** raise exceptions in production clinical paths. Use `raise_on_failure=True` only in tests or admin tooling.

---

## Where to call from

| Layer | Recommended |
|---|---|
| Service layer (after successful save) | Yes — primary integration point |
| Django view / API handler | Only if no service wrapper exists |
| Model `save()` / signals | No — keeps audit out of persistence hooks |
| Celery task | Yes — ensure `LogContext` is restored (Phase 2 Celery support) |

Example placement in a service method:

```python
@transaction.atomic
def start_consultation(self, encounter, user):
    consultation = self._create_consultation(encounter)
    self._transition_encounter(encounter)

    # Audit after business state is committed
    ClinicalAuditService.record(
        action=AuditAction.CONSULTATION_STARTED,
        event="Consultation started",
        resource_type=ClinicalEntity.CONSULTATION,
        resource_id=str(consultation.id),
        source=AuditSource.DOCTOR,
        user_id=str(user.id),
        organization_id=str(encounter.clinic_id),
        encounter_id=str(encounter.id),
        consultation_id=str(consultation.id),
        patient_account_id=str(encounter.patient_account_id),
        payload={"encounter_status": encounter.status},
    )

    return consultation
```

---

## Do's and don'ts

| Do | Don't |
|---|---|
| Use `AuditAction` / `ClinicalEntity` enums | Invent ad-hoc action strings |
| Pass `organization_id` as clinic UUID | Skip organization validation |
| Put business data in `payload` | Store passwords, OTPs, or tokens |
| Reuse `correlation_id` across related events | Modify or delete audit rows |
| Record **after** clinical success | Block patient care on audit failure |

---

## Module integration pattern (M3.3+)

Do **not** call `ClinicalAuditService.record()` directly from views. Use a module `audit/` package:

```
module_name/audit/
    {module}_audit_service.py   # thin facade
    payload_builder.py
    statistics_builder.py       # if needed
    constants.py
    commit.py                   # optional; or import from consultations_core.audit.commit
```

Example (consultation — reference implementation):

```python
from consultations_core.audit import ConsultationAuditService, emit_after_commit

# After business success, inside a transaction:
emit_after_commit(
    ConsultationAuditService.emit_findings_updated,
    encounter,
    consultation,
    user,
    changed_fields=["note"],
    snapshot=snapshot_captured_before_mutation,
)
```

Rules:

- Facade only **translates → maps → delegates**
- Payload/snapshot/stats live in builders
- Use `audit_event_label(AuditAction.X)` for display text — never hardcode event strings
- Emit via `transaction.on_commit` (use `emit_after_commit`)
- Fail-open: ignore `result.success is False` in clinical flows

See [CONSULTATION_AUDIT.md](CONSULTATION_AUDIT.md), [CLINICAL_DOCUMENTATION_AUDIT.md](CLINICAL_DOCUMENTATION_AUDIT.md), [PRESCRIPTION_AUDIT.md](PRESCRIPTION_AUDIT.md), and [AUDIT_EVENTS.md](AUDIT_EVENTS.md).

### Clinical documentation example (M3.4)

```python
from clinical_documentation.audit import schedule_allergy_audits

# After PreConsultationAllergies upsert succeeds:
schedule_allergy_audits(
    encounter=encounter,
    user=request.user,
    section_obj=section_obj,
    prior_data=prior_data,
    consultation=consultation,  # optional during pre-consult
    source="doctor",
)
```

### Prescription & recommendation example (M3.5)

```python
from consultations_core.audit import (
    schedule_prescription_created,
    schedule_prescription_signed,
    schedule_prescription_downloaded,
    schedule_recommendation_generated,
)

schedule_prescription_created(consultation=consultation, user=user, prescription=rx)
prescription.finalize()
schedule_prescription_signed(consultation=consultation, user=user, prescription=rx)
schedule_prescription_downloaded(prescription=rx, request=request)
schedule_recommendation_generated(
    consultation=consultation,
    user=request.user,
    recommendation_id=recommendation_id,
    result=result,
)
```

### Diagnostic & report example (M3.6)

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
schedule_test_recommendation_sent(message=whatsapp_message)
schedule_report_uploaded(report=report, user=user, artifacts=created)
schedule_report_viewed(report=report, user=request.user)
schedule_report_downloaded(report=report, user=request.user)
schedule_report_shared(report=report, user=request.user, channel="WHATSAPP")
```

---

## Available actions

See `clinical_audit/enums.py` for the full closed vocabulary. Examples:

- `AuditAction.CONSULTATION_STARTED` / `CONSULTATION_COMPLETED` / `CONSULTATION_CANCELLED`
- `AuditAction.CONSULTATION_FINDINGS_UPDATED` / `CONSULTATION_INSTRUCTIONS_UPDATED` / `CONSULTATION_INVESTIGATIONS_UPDATED`
- `AuditAction.PRESCRIPTION_CREATED` / `PRESCRIPTION_SIGNED` / `PRESCRIPTION_UPDATED` / `PRESCRIPTION_DOWNLOADED`
- `AuditAction.RECOMMENDATION_GENERATED` / `RECOMMENDATION_ACCEPTED` / `RECOMMENDATION_SENT`
- `AuditAction.TEST_ORDERED`
- `AuditAction.DIAGNOSIS_ADDED` / `DIAGNOSIS_UPDATED` / `DIAGNOSIS_REMOVED`
- `AuditAction.ALLERGY_ADDED` / `ALLERGY_UPDATED`
- `AuditAction.VITAL_SIGNS_RECORDED` / `SYMPTOMS_RECORDED`
- `AuditAction.CLINICAL_NOTES_UPDATED` (facade ready)
- `AuditAction.REPORT_UPLOADED` / `REPORT_VIEWED` / `REPORT_DOWNLOADED` / `REPORT_SHARED`

Add new actions to `AuditAction` when introducing a new module event type, then call `ClinicalAuditService.record()` — no changes to the core service are required.

---

## Certification (M3.7)

Validate production readiness without modifying business data:

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest clinical_audit/tests/test_patient_workflow.py -v
```

Programmatic check:

```python
from clinical_audit.certification import ClinicalAuditCertificationService

report = ClinicalAuditCertificationService().certify(
    correlation_id=correlation_id,
    consultation_id=str(consultation.id),
)
assert report.passed, report.errors
```

See [CERTIFICATION.md](CERTIFICATION.md), [CERTIFICATION_CHECKLIST.md](CERTIFICATION_CHECKLIST.md), and [SAMPLE_PATIENT_TIMELINE.md](SAMPLE_PATIENT_TIMELINE.md).

---

## Further reading

- [SERVICE.md](SERVICE.md) — architecture, validation rules, API-to-model mapping
- [MODELS.md](MODELS.md) — database schema and `new_value._meta` envelope
- [CONSULTATION_AUDIT.md](CONSULTATION_AUDIT.md) — M3.3 reference integration
- [CLINICAL_DOCUMENTATION_AUDIT.md](CLINICAL_DOCUMENTATION_AUDIT.md) — M3.4 clinical documentation integration
- [PRESCRIPTION_AUDIT.md](PRESCRIPTION_AUDIT.md) — M3.5 prescription and recommendation integration
- [DIAGNOSTIC_AUDIT.md](DIAGNOSTIC_AUDIT.md) — M3.6 diagnostic and report integration
- [CERTIFICATION.md](CERTIFICATION.md) — M3.7 certification and release gate
- [CERTIFICATION_CHECKLIST.md](CERTIFICATION_CHECKLIST.md) — M3.7 checklist
- [SAMPLE_PATIENT_TIMELINE.md](SAMPLE_PATIENT_TIMELINE.md) — M3.7 canonical journey
- [AUDIT_EVENTS.md](AUDIT_EVENTS.md) — event catalogue
