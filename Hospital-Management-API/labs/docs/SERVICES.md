---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Services — labs

## workflow_transitions.py

| Method | Role |
|---|---|
| `accept_assignment()` | ACCEPT assignment; create logistics row |
| Reject/cancel transitions | Assignment terminal states |

**Transaction:** `@transaction.atomic` — assignment + logistics creation.

## collection_workflow.py

Enforces `ALLOWED_TRANSITIONS` for `CollectionStatus`. Views must call service methods only.

## visit_workflow.py

Branch visit: confirm, reschedule, check-in, complete, no-show. Provisions executions at check-in via `test_execution_provisioning`.

## test_execution_provisioning

Creates `LabOrderTestExecution` per test line after logistics milestone. See former `TEST_EXECUTION_PROVISIONING_ARCHITECTURE.md`.

## Pricing services

`api/services/pricing_catalog_list_service.py` — branch catalog for diagnostics quotes.

## Dependencies

- diagnostics_engine: order, test lines, routing
- patient_account: patient contact for collection

## Retry

- Stale assignment auto-reject: `auto_reject_stale_lab_assignments` management command
