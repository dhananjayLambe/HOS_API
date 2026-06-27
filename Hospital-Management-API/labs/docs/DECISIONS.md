---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Architecture Decisions — labs

## ADR-L001: ACCEPT ≠ sample collected

| Field | Value |
|---|---|
| Status | Accepted |
| Context | Operators confused assignment accept with fulfillment complete |
| Decision | ACCEPT only means lab agrees to handle order; logistics rows stay PENDING |
| References | Former `HOME_ORDER_ACCEPTANCE_WORKFLOW.md` |

## ADR-L002: Separate logistics vs execution layers

| Field | Value |
|---|---|
| Status | Accepted |
| Decision | `LabCollectionRequest` / `LabVisitAppointment` vs `LabOrderTestExecution` |
| Consequences | Test executions provisioned after logistics milestone |

## ADR-L003: Workflow services own all status changes

| Field | Value |
|---|---|
| Status | Accepted |
| Decision | Views call `collection_workflow`, `visit_workflow`, `workflow_transitions` only |
