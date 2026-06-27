---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Architecture Decisions — diagnostics_engine

Template: [shared_docs/standards/adr-template.md](../../shared_docs/standards/adr-template.md)

## ADR-001: Reports owned by DiagnosticTestReport, not assignments

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-06-27 |
| Context | Assignments are operational queue cards; reports are clinical lifecycle entities |
| Decision | Upload/delivery APIs use `report_id`; `task_id` maps to `LabOrderAssignment.id` for queue UI only |
| Alternatives | 1 assignment = 1 report container (rejected) |
| Consequences | Clear separation of ops vs clinical; upload never targets task_id |
| Migration Plan | Legacy routes deprecated under `api/diagnostics/` |
| References | Former `DIAGNOSTIC_REPORTING_OPERATIONAL_TRUTH_TABLE.md` |

## ADR-002: Package SKU pricing with optional derived fallback

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-06-27 |
| Context | Marketing package prices differ from sum of individual tests |
| Decision | Primary: `BranchPackagePricing`; fallback sum only when `DIAGNOSTICS_ALLOW_DERIVED_PACKAGE_PRICING=True` |
| Alternatives | Always sum services (rejected: breaks marketing SKUs) |
| Consequences | Must snapshot prices on order confirm |
| References | Former `pricing_rules.md` |

## ADR-003: STRICT branch package availability

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-06-27 |
| Context | Partial catalog at a branch causes fulfillment failures |
| Decision | All package services must have branch pricing for quote/confirm |
| Alternatives | Partial availability (deferred — `fulfillment_mode=partial`) |
| References | Former `fulfillment_rules.md` |

## ADR-004: Per-line reports preferred over order rollup

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-06-27 |
| Context | Multi-test orders need independent report lifecycles |
| Decision | `DiagnosticTestReport` per line; `OrderStatusAggregationService` rolls up order status |
| Alternatives | Single `DiagnosticReport` per order only (legacy, nullable) |

## ADR-005: Reports stored in S3 with presigned URLs

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-06-27 |
| Context | PDF storage growth |
| Decision | S3 via django-storages; tokenized download in API |
| Alternatives | DB blobs (rejected) |
| References | `HOS_API/docs/backend/Hospital-Management-API/REPORT_STORAGE_S3_SETUP.md` |
