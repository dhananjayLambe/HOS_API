---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# API Reference — diagnostics_engine

Base paths: `/api/diagnostics/`, `/api/v1/diagnostics/` (operational reports).

Authentication: JWT unless noted. See [PERMISSIONS.md](PERMISSIONS.md).

## Catalog

| Method | Path | Purpose | Side effects |
|---|---|---|---|
| GET/POST | `/api/diagnostics/catalog/services/` | Service master CRUD | — |
| GET/POST | `/api/diagnostics/catalog/packages/` | Package CRUD | — |
| GET | `/api/diagnostics/catalog/search/` | Unified catalog search | Cache |
| POST | `/api/diagnostics/catalog/quote/package/` | Package price quote | Reads branch pricing |
| GET | `/api/diagnostics/catalog/packages/{id}/providers/` | Eligible providers | Routing predicates |
| GET | `/api/diagnostics/search/` | Investigation search | — |
| GET | `/api/diagnostics/investigations/suggestions/` | AI/rule suggestions | `ENABLE_SUGGESTIONS` |

## Marketplace (v1 platform)

| Method | Path | Purpose | Side effects |
|---|---|---|---|
| POST | `/api/v1/marketplace/diagnostics/recommendations/` | Pre-booking lab recommendation | Audit row only |

Nested envelope: `metadata`, `recommendation`, `tests`, `packages`, `error`. See `shared_docs/architecture/whatsapp_test_booking/milestone_3/M3_API_Contract.md`.

## Orders

| Method | Path | Purpose | Side effects |
|---|---|---|---|
| POST | `/api/diagnostics/orders/create-from-consultation/` | Create order from investigation | Links encounter |
| GET | `/api/diagnostics/orders/{id}/routing/` | Routing summary | — |
| GET | `/api/diagnostics/orders/{id}/reports/` | List order reports | — |

## Reports (legacy path)

| Method | Path | Purpose | Side effects |
|---|---|---|---|
| GET/POST | `/api/diagnostics/test-lines/{line_id}/report/` | Line report CRUD | — |
| POST | `/api/diagnostics/reports/{id}/artifacts/` | Upload artifact | S3, audit |
| POST | `/api/diagnostics/reports/{id}/ready/` | Mark ready | Status change |
| POST | `/api/diagnostics/reports/{id}/deliver/` | Deliver report | WhatsApp, Celery |
| GET | `/api/diagnostics/reports/{id}/artifacts/{aid}/download/` | Download artifact | Presigned URL |

## Reports (v1 operational)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/diagnostics/report-tasks/` | Assignment queue cards |
| GET | `/api/v1/diagnostics/report-tasks/{task_id}/` | Assignment + upload targets |
| POST | `/api/v1/diagnostics/reports/{report_id}/artifacts/upload/` | **Primary upload entry** |
| POST | `/api/v1/diagnostics/reports/{report_id}/mark-ready/` | IN_PROGRESS → READY |
| POST | `/api/v1/diagnostics/reports/{report_id}/send-whatsapp/` | Delivery |
| POST | `/api/v1/diagnostics/delivery-logs/{log_id}/retry/` | Append-only retry |
| GET | `/api/v1/diagnostics/patients/{id}/reports/` | Patient reports (DESC) |
| GET | `/api/v1/diagnostics/encounters/{id}/reports/` | Encounter reports (ASC) |

## Errors

See [shared_docs/ERRORS.md](../../shared_docs/ERRORS.md). Key: `BOOKING_EMPTY`, `LAB_NOT_AVAILABLE`, `INVALID_ORDER_TRANSITION`, `UPLOAD_TARGET_WRONG_ENTITY`.

## Swagger

Auto-generated at `/swagger/` — use this doc for **why** and side effects.

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

| Route | View | Source |
|---|---|---|
| `orders/<uuid:order_id>/routing/` | as_view | urls.py |
| `orders/create-from-consultation/` | as_view | urls.py |
| `search/` | as_view | urls.py |
| `` | — | urls.py |
| `investigations/suggestions/` | as_view | urls.py |
| `catalog/quote/package/` | as_view | urls.py |
| `catalog/packages/<uuid:package_id>/providers/` | as_view | urls.py |
| `catalog/search/` | as_view | urls.py |
| `test-lines/<uuid:line_id>/report/` | as_view | urls.py |
| `reports/<uuid:report_id>/artifacts/` | as_view | urls.py |
| `reports/<uuid:report_id>/ready/` | as_view | urls.py |
| `reports/<uuid:report_id>/deliver/` | as_view | urls.py |
| `reports/<uuid:report_id>/artifacts/<uuid:artifact_id>/download/` | as_view | urls.py |
| `orders/<uuid:order_id>/reports/` | as_view | urls.py |

<!-- auto-generated:api:end -->
