---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Flow — labs

## Why this module exists

Fulfillment layer for diagnostic orders: lab network, pricing at branch level, assignment acceptance, sample collection (home or branch), test execution, and coordination with report upload in diagnostics_engine.

## Actors

| Actor | Role |
|---|---|
| Lab operator | Accept/reject assignments, manage collection/visits |
| Phlebotomist | Home collection |
| Patient | Branch visit check-in |
| System | Provisioning executions after logistics milestones |

## Three layers after assignment ACCEPT

| Layer | Model | Question |
|---|---|---|
| Ownership | `LabOrderAssignment` | Which lab owns the order? |
| Logistics (home) | `LabCollectionRequest` | How is sample collected at home? |
| Logistics (visit) | `LabVisitAppointment` | When does patient visit branch? |
| Execution | `LabOrderTestExecution` | Per-test medical lifecycle |

**ACCEPT means:** lab agrees to handle the order — not sample collected, not processing, not report ready.

## Entry points

- Routing creates `LabOrderAssignment` (from diagnostics_engine)
- Lab API: accept/reject assignment
- Collection/visit scheduling and completion

## Exit points

- All executions `completed` or terminal cancel/reject
- Reports uploaded via diagnostics_engine APIs

Migrated from `documents/HOME_ORDER_ACCEPTANCE_WORKFLOW.md`.

## Edge cases

- Home OR branch visit — not both for same fulfillment path
- Collection/visit rows stay `PENDING` after accept until field ops complete
- Test executions provisioned after logistics milestone (check-in / collected)
