---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Data Lifecycle

Create, update, delete, archive, retention, and PII handling for major entity classes.

## PatientProfile

| Concern | Policy |
|---|---|
| Created | `patient_account` registration / helpdesk |
| Updates | Patient self-service or staff; **DOB immutable** (INV-009) |
| Delete | Deactivate only; no hard delete |
| PII | Name, phone, DOB, address — mask in logs |
| Retention | Active while account exists |

## ClinicalEncounter

| Concern | Policy |
|---|---|
| Created | Check-in, helpdesk, or doctor entry |
| Updates | Status via `EncounterStateMachine` only |
| Delete | Not allowed after `consultation_completed` |
| Archive | `closed` is terminal archive state |
| PII | Links to patient; audit via `EncounterStatusLog` |

## Prescription

| Concern | Policy |
|---|---|
| Created | During consultation |
| Updates | Draft editable; finalized immutable |
| Delete | Cancel only before delivery; no delete after finalized |
| S3 | PDF stored per [integrations/s3-reports.md](integrations/s3-reports.md) |
| Retention | Clinical record — indefinite |

## DiagnosticOrder

| Concern | Policy |
|---|---|
| Created | Patient booking or consultation handoff |
| Updates | Status via `update_status()`; pricing snapshotted at confirm |
| Delete | Cancel only |
| Retention | Commercial + clinical audit — indefinite |

## DiagnosticTestReport

| Concern | Policy |
|---|---|
| Created | Lab upload after sample processing |
| Updates | Until `delivered`; then immutable (INV-005) |
| Delete | Not allowed after delivery |
| S3 path | `{bucket}/reports/{report_id}/...` via django-storages |
| Retention | Indefinite; correction via new revision head |

## WhatsApp delivery logs

| Concern | Policy |
|---|---|
| Created | On send attempt |
| Updates | Append-only retry rows (INV-004) |
| Delete | **Never** |
| Retention | Indefinite audit trail |

## LabOrderAssignment

| Concern | Policy |
|---|---|
| Created | Routing assigns branch |
| Updates | Status via lab workflow services |
| Delete | Complete or cancel; no hard delete |

## Audit logs (consultations_core)

| Concern | Policy |
|---|---|
| Created | On status/field changes via `AuditService` |
| Delete | Never |
| Retention | Indefinite |

## Media / local fallback

When `AWS_REPORTS_BUCKET` unset, files use `MEDIA_ROOT` (`media/`). Not for production.
