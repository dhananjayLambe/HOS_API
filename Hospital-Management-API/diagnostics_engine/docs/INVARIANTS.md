---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Module Invariants — diagnostics_engine

Extends [shared_docs/INVARIANTS.md](../../shared_docs/INVARIANTS.md).

| ID | Invariant | Enforced In |
|---|---|---|
| INV-001 | Report requires confirmed order/line | `services/reports/` |
| INV-002 | Booking has ≥1 test | Order validation |
| INV-005 | Report immutable after delivery | Report services |
| INV-006 | Price snapshotted at confirm | `DiagnosticOrderItem` |
| INV-007 | Upload uses report_id | `api/views/reports/` |

## Local rules

- Order status changes only through `update_status()`
- Routing reject snapshots capped by configuration
- Legacy `DiagnosticReport` rollup optional; per-line reports preferred (ADR-004)
