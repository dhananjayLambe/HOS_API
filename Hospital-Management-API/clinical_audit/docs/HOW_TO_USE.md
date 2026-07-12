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

## Available actions

See `clinical_audit/enums.py` for the full closed vocabulary. Examples:

- `AuditAction.CONSULTATION_STARTED` / `CONSULTATION_COMPLETED` / `CONSULTATION_CANCELLED`
- `AuditAction.PRESCRIPTION_GENERATED` / `PRESCRIPTION_UPDATED`
- `AuditAction.DIAGNOSIS_ADDED` / `DIAGNOSIS_UPDATED` / `DIAGNOSIS_REMOVED`
- `AuditAction.REPORT_UPLOADED` / `REPORT_VIEWED` / `REPORT_DOWNLOADED`

Add new actions to `AuditAction` when introducing a new module event type, then call `ClinicalAuditService.record()` — no changes to the core service are required.

---

## Further reading

- [SERVICE.md](SERVICE.md) — architecture, validation rules, API-to-model mapping
- [MODELS.md](MODELS.md) — database schema and `new_value._meta` envelope
- [README.md](README.md) — app overview and coexistence with legacy `ClinicalAuditLog`
