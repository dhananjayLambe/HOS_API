---
owner: clinical-audit-team
module: clinical_audit
version: 1.0
last_updated: 2026-07-12
status: approved
---

# Sample Patient Timeline — Certification Journey

Reference scenario for regression testing and release certification. Times are illustrative; tests use real `timestamp` ordering with short pauses between steps.

## Narrative timeline

| Time | Event | Action ID |
|---|---|---|
| 08:00 | Vitals Recorded | `vitals.recorded` |
| 08:01 | Consultation Started | `consultation.started` |
| 08:02 | Test Ordered | `test.ordered` |
| 08:03 | Recommendation Sent | `recommendation.sent` |
| 08:05 | Report Uploaded | `report.uploaded` |
| 08:06 | Report Viewed | `report.viewed` |
| 08:07 | Report Downloaded | `report.downloaded` |
| 08:08 | Report Shared | `report.shared` |
| 08:09 | Symptoms Recorded | `symptoms.recorded` |
| 08:10 | Diagnosis Added | `diagnosis.added` |
| 08:11 | Prescription Created | `prescription.created` |
| 08:12 | Prescription Signed | `prescription.signed` |
| 08:13 | Consultation Completed | `consultation.completed` |

> **Note:** Vitals are captured during pre-consultation (before consultation start) in the certification workflow. The business narrative may list symptoms before vitals; certification validates production-achievable ordering via tier and pairwise rules.

## Expected database rows (per event)

Each row in `clinical_audit` should include:

| Field | Expected |
|---|---|
| `correlation_id` | Same UUID across all 13 rows |
| `consultation_id` | Set on all rows except optional pre-consult vitals |
| `patient_account_id` | Patient account UUID string |
| `user_id` | Acting user UUID string |
| `resource_type` | Matches clinical entity (consultation, report, prescription, etc.) |
| `resource_id` | Entity primary key as string |
| `action` | One of the 13 action IDs above |
| `event` | Human label from `AuditAction.label` |
| `new_value._meta.organization_id` | Clinic or lab organization ID |
| `new_value.payload` | Sanitized metadata (no secrets, no binary) |
| `previous_value` | Null for these journey events (snapshots only on update actions) |

## Example row — consultation.started

```json
{
  "action": "consultation.started",
  "event": "Consultation Started",
  "correlation_id": "cert-00000000-0000-4000-8000-000000000001",
  "consultation_id": "<uuid>",
  "patient_account_id": "<uuid>",
  "resource_type": "consultation",
  "resource_id": "<uuid>",
  "new_value": {
    "_meta": {
      "organization_id": "<clinic-id>",
      "occurred_at": "..."
    },
    "payload": {
      "status": "started",
      "source": "doctor"
    }
  }
}
```

## Running the sample workflow

See `clinical_audit/tests/support/certification_workflow.py` and `test_patient_workflow.py`.

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest \
  clinical_audit/tests/test_patient_workflow.py -v
```

## Deferred event

| Event | Status |
|---|---|
| `patient.record_created` | Enum defined; no production hook in M3.2–M3.7 |
