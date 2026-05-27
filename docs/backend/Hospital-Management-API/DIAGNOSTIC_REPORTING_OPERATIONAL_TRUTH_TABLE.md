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
| GET | `api/v1/diagnostics/reports/<report_id>/download/` | Presigned URL `{ download_url, expires_in, filename, artifact_id }`; local dev `?stream=1` |
| POST | `api/v1/diagnostics/reports/<report_id>/mark-ready/` | IN_PROGRESS → READY; supports `Idempotency-Key` |
| POST | `api/v1/diagnostics/reports/<report_id>/send-whatsapp/` | Async delivery (WhatsApp/SMS/EMAIL); `Idempotency-Key` |
| GET | `api/v1/diagnostics/reports/operational-metrics/` | Branch TAT, SLA breach rate, delivery stats |
| POST | `api/v1/diagnostics/delivery-logs/<log_id>/retry/` | Append-only retry (FAILED parent only) |
| GET | `api/v1/diagnostics/reports/<report_id>/history/` | Operational active lineage (not audit) |
| GET | `api/v1/diagnostics/patients/<patient_id>/reports/` | Patient-wide summaries (DESC `updated_at`) |
| GET | `api/v1/diagnostics/encounters/<encounter_id>/reports/` | Encounter summaries (ASC `updated_at`) |

Legacy: `api/diagnostics/...` (deprecated).

## API package layout (matches `labs.api` / `diagnostics_engine.api`)

```
diagnostics_engine/api/
├── views/reports/
│   ├── mixins.py
│   ├── legacy.py
│   ├── operational.py
│   ├── mark_ready.py
│   ├── send_whatsapp.py
│   ├── retry_delivery.py
│   ├── report_history.py
│   ├── patient_reports.py
│   ├── encounter_reports.py
│   └── __init__.py
├── serializers/reports/
├── report_urls.py
├── urls.py
├── responses.py
├── error_codes.py
└── pagination.py
```

## Assignment → reports grouping (no DB FK)

`LabOrderAssignment.diagnostic_order` → `order.test_lines` → `get_active_report_for_line(line)` per line.

Prefetch only in `ReportQueryService`.

## Ownership

- One assignment → one order → many lines → many active report heads
- Delivery unit = one `DiagnosticTestReport`
- Patient sees latest active head; superseded download tokens invalid

## Operational hardening (Tasks 55–60)

| Area | Rule |
|------|------|
| Branch source of truth | `report.order_test_line.order.branch_id` via `access_control.py` |
| Branch queryset filters | Only in `ReportQueryService` — views never `.filter(branch_id=...)` |
| Request context | `request._report_context` (`lab_user`, `branch_id`, `request_id`) |
| Permissions | `CanUploadReports`, `CanDeliverReports`, `CanViewReportDetail`, `CanCorrectReports`, `CanDownloadReports` + `REPORT_ACTION_PERMISSION_MAP` |
| Upload rollback | Best-effort `default_storage.delete` on transaction failure; `exists()` check per path |
| Monitoring | Logger namespace `diagnostics.reports`; events include `event_version`, `outcome`, `duration_ms` |
| Correlation | `monitoring/request_context.py` — `get_request_id()` / `set_request_id()` |
| Side effects | `safe_emit()` — audit/monitoring/metrics never raise into workflows |
