# Clinical Audit Models

## ClinicalAudit

Permanent clinical audit record for a single patient-care action.

Source: `clinical_audit/models/audit.py`

Identifiers are stored as strings — **no foreign keys** to clinical entities — so audit rows survive entity deletion and cannot be cascade-deleted.

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | UUID primary key (audit id) |
| `timestamp` | yes | Insert time (`auto_now_add`) |
| `correlation_id` | **yes** | Links to Phase 2 request tracing |
| `user_id` / `user_role` | no | Actor at time of action |
| `patient_account_id` / `patient_profile_id` | no | Patient identifiers |
| `consultation_id` / `encounter_id` | no | Clinical workflow identifiers |
| `module` / `event` / `action` | yes | What happened |
| `outcome` | yes | `success` / `failed` / `partial` |
| `resource_type` / `resource_id` | no | Affected clinical entity |
| `previous_value` / `new_value` | no | Optional JSON snapshots (no secrets) |
| `source` | yes | `system` / `doctor` / `helpdesk` / `patient` / `admin` |
| `ip_address` / `device_information` / `remarks` | no | Context |

### `new_value` envelope (M3.2)

When written via `ClinicalAuditService`, `new_value` uses a structured envelope:

```json
{
  "_meta": {
    "organization_id": "<clinic-uuid>",
    "request_id": "<from LogContext>",
    "occurred_at": "2026-07-04T12:00:00+00:00",
    "timezone": "Asia/Kolkata",
    "application_version": "0.0.0",
    "service_name": "consultations_core",
    "hostname": "api-1"
  },
  "payload": { }
}
```

Business payload lives under `payload`. Service metadata lives under `_meta`. `organization_id` is not a first-class column in M3.1; it is stored in `_meta` until a future schema extension if needed.

`db_table = "clinical_audit"`.

## Enums

Source: `clinical_audit/enums.py`

| Enum | Purpose |
|------|---------|
| `AuditAction` | Clinical actions (dot-notation), e.g. `consultation.started` |
| `ClinicalEntity` | Resource types (`patient`, `consultation`, `report`, …) |
| `AuditOutcome` | `success`, `failed`, `partial` |
| `AuditSource` | `system`, `doctor`, `helpdesk`, `patient`, `admin` |

## Immutability

- `save()` allows insert only
- `delete()` always raises `ClinicalAuditImmutabilityError`
- `QuerySet.update()` / `QuerySet.delete()` raise the same error
- Django admin is read-only (no add / change / delete)

Never store passwords, OTPs, or tokens in `previous_value` / `new_value`.

## Indexes

Investigation-oriented composite indexes:

- `(correlation_id, timestamp)`
- `(patient_account_id, timestamp)`
- `(consultation_id, timestamp)`
- `(encounter_id, timestamp)`
- `(user_id, timestamp)`
- `(resource_type, resource_id)`
- `(action, timestamp)`
- `timestamp`
