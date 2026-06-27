---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# diagnostics_engine — AI Context



## Module Purpose

Diagnostic test catalog, patient booking (commercial orders), lab routing, pricing snapshots, and report lifecycle. Bridges clinical investigations from consultations_core to lab fulfillment in labs.

## Read First

- [docs/BUSINESS_FLOW.md](docs/BUSINESS_FLOW.md)
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md)
- [shared_docs/glossary/healthcare_terms.md](../shared_docs/glossary/healthcare_terms.md) — Booking, Order, Report
- [shared_docs/INVARIANTS.md](../shared_docs/INVARIANTS.md) — INV-001, INV-002, INV-005, INV-006, INV-007

## Main Services

| Area | Path | Role |
|---|---|---|
| Routing | `services/routing/` | Lab eligibility, assignment, reject snapshots |
| Booking / orders | `domain/`, `models/orders.py` | Order creation, status, line expansion |
| Reports | `services/reports/` | Upload, delivery, immutability |
| Catalog | `models/catalog.py`, import commands | Tests, packages, categories |
| Pricing | Branch pricing integration with labs | SKU snapshots on confirm |

## Important Models

`DiagnosticOrder`, `DiagnosticOrderItem`, `DiagnosticOrderTestLine`, `DiagnosticServiceMaster`, `DiagnosticPackage`, `DiagnosticTestReport`, `DiagnosticReportArtifact`

## Business Rules AI Must Never Violate

- Never delete a delivered report (INV-005)
- Never confirm an order with zero test lines (INV-002)
- Always snapshot pricing at booking/confirm time (INV-006)
- Upload APIs target `report_id`, never assignment `task_id` (INV-007)
- Do not duplicate status enums — use [status_registry.md](../shared_docs/status_registry.md)

## Common Extension Points

- Add catalog test: `DiagnosticServiceMaster` + `sync_diagnostic_*` management commands
- Add routing rule: `services/routing/` eligibility modules
- Add report workflow step: `api/views/reports/`

## Do Not

- Conflate Booking with Appointment or Lab Assignment
- Create reports outside order/test line lifecycle
- Modify `DiagnosticOrder.status` without `update_status()`
