---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# labs — AI Context



## Module Purpose

Lab network, branch pricing, order assignment, home collection, branch visits, test execution, and report upload coordination.

## Read First

- [docs/WORKFLOWS.md](docs/WORKFLOWS.md)
- [docs/BUSINESS_FLOW.md](docs/BUSINESS_FLOW.md)
- [shared_docs/status_registry.md](../shared_docs/status_registry.md) — Lab Assignment, Collection, Visit, Test Execution

## Main Services

| Path | Role |
|---|---|
| `services/workflow_transitions.py` | Assignment accept/reject |
| `services/collection_workflow.py` | Home collection state machine |
| `services/visit_workflow.py` | Branch visit state machine |
| `services/test_execution_provisioning.py` | Execution rows at check-in/collection |

## Important Models

`Lab`, `LabBranch`, `LabOrderAssignment`, `LabCollectionRequest`, `LabVisitAppointment`, `LabOrderTestExecution`, pricing models

## Business Rules AI Must Never Violate

- ACCEPT on assignment means lab agrees to handle order — not sample collected
- Status changes via workflow services only — never direct model mutation in views
- Upload targets `report_id` in diagnostics_engine, not assignment task_id

## Do Not

- Conflate assignment status with collection/visit/execution status
- Skip provisioning rules documented in SERVICES.md
