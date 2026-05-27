# Diagnostic Reports E2E — Phase 1 Implementation Plan

## Scope

Extend canonical `diagnostics_engine` models and **existing v1 routes** — no parallel `LabReport` APIs.

## API reuse (frozen)

| Action | Route |
|--------|-------|
| Upload | `POST /api/v1/diagnostics/reports/{id}/artifacts/upload/` |
| Finalize | `POST .../mark-ready/` |
| Download | `GET .../download/` |
| Deliver / share | `POST .../send-whatsapp/` |
| Patient list | `GET .../patients/{id}/reports/` |
| Encounter list | `GET .../encounters/{id}/reports/` |
| Metrics | `GET .../reports/operational-metrics/` |

## Phases delivered

- **1A:** S3 config, presigned downloads, idempotency, permissions, Celery delivery, audit
- **1B:** Doctor/patient ACL on list routes, multi-channel send-whatsapp, frontend draft/submit
- **1C:** Operational metrics (TAT, SLA breach rate, delivery failures)

## Environment

See [REPORT_STORAGE_S3_SETUP.md](../backend/Hospital-Management-API/REPORT_STORAGE_S3_SETUP.md) and [REPORT_IDEMPOTENCY_CONTRACT.md](../backend/Hospital-Management-API/REPORT_IDEMPOTENCY_CONTRACT.md).
