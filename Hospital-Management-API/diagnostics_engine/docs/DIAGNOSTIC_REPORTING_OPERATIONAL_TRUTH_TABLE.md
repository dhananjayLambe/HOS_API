> **Superseded:** Summary in [DECISIONS.md](DECISIONS.md) ADR-001 and [API.md](API.md). This file preserved as historical reference.

# Diagnostic Reporting — Operational Truth Table

**Status:** APPROVED (CTO signoff)  
**Phase:** 2 — Backend API Layer (Tasks 41–60)

## Five frozen rules

| # | Rule |
|---|------|
| 1 | **Assignments** are operational queue containers (`task_id` = `LabOrderAssignment.id`) |
| 2 | **Reports** are clinical lifecycle entities (`report_id` = `DiagnosticTestReport.id`) |
| 3 | **Artifacts** belong to reports only — never assignments |
| 4 | **Delivery** belongs to reports, not assignments |
| 5 | **Upload APIs target `report_id`**, not `task_id` — files belong to reports |

**Revoked:** `1 assignment = 1 report container`; `lab_order_assignment` FK on reports; `POST /report-tasks/{task_id}/upload/`.

## Frozen contracts (Tasks 49–54)

| Contract | Rule |
|----------|------|
| Active-head-only operational APIs | Exclude superseded revisions and soft-deleted heads |
| Tokenized download only | Never `artifact.file.url` in API; opaque token in delivery log metadata |
| Append-only delivery logs | Retry creates new row; never mutate prior attempts |
| Operational vs audit | `GET .../history/` is **active lineage only** (`get_operational_report_history`) — not full audit |
| Patient report ordering | **DESC** by `updated_at` (cursor pagination) |
| Encounter report ordering | **ASC** by `updated_at` (clinical progression oldest → newest) |

## Entity responsibilities

| Entity | Responsibility |
|--------|----------------|
| `LabOrderAssignment` | Operational execution, queue, branch, collection — **not report owner** |
| `DiagnosticOrder` | Patient clinical container |
| `DiagnosticOrderTestLine` | Clinical test ownership |
| `DiagnosticTestReport` | Lifecycle + correction + delivery mirror |
| `DiagnosticReportArtifact` | Files |
| `LabReportDeliveryLog` | Communication audit |
| `ReportTaskDTO` | Operational UI card (not DB) |

## API identity (immutable, stable)

| Public API | Internal |
|------------|----------|
| `task_id` | `LabOrderAssignment.id` |
| `assignment_id` | same UUID |
| `report_id` | `DiagnosticTestReport.id` |
| `artifact_id` | `DiagnosticReportArtifact.id` |
| `line_id` | `DiagnosticOrderTestLine.id` |

## v1 route contract

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `api/v1/diagnostics/report-tasks/` | Paginated operational queue (assignment cards) |
| GET | `api/v1/diagnostics/report-tasks/<task_id>/` | Assignment context + active reports (upload targets) |
| POST | `api/v1/diagnostics/reports/<report_id>/artifacts/upload/` | **Only upload entry** |
| GET | `api/v1/diagnostics/reports/<report_id>/` | Operational detail (active head only) |
| GET | `api/v1/diagnostics/reports/<report_id>/download/` | Presigned URL |
| POST | `api/v1/diagnostics/reports/<report_id>/mark-ready/` | IN_PROGRESS → READY |
| POST | `api/v1/diagnostics/reports/<report_id>/send-whatsapp/` | Async delivery |
| POST | `api/v1/diagnostics/delivery-logs/<log_id>/retry/` | Append-only retry (FAILED parent only) |
| GET | `api/v1/diagnostics/reports/<report_id>/history/` | Operational active lineage (not audit) |
| GET | `api/v1/diagnostics/patients/<patient_id>/reports/` | Patient-wide summaries (DESC `updated_at`) |
| GET | `api/v1/diagnostics/encounters/<encounter_id>/reports/` | Encounter summaries (ASC `updated_at`) |

Legacy: `api/diagnostics/...` (deprecated).

## Ownership

- One assignment → one order → many lines → many active report heads
- Delivery unit = one `DiagnosticTestReport`
- Patient sees latest active head; superseded download tokens invalid
