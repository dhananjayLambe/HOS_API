---
owner: platform-team
module: whatsapp_test_booking
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
milestone: M1
document_type: current_state_analysis
---

# 06 — Operations Runbook

## Purpose

Document the current laboratory operational workflow: assignment, accept/reject, auto-reject, home collection, branch visit, and test execution — as implemented in the `labs` app.

Future operational runbooks (escalation, dashboards, incident response) are out of scope for Milestone 1.

---

## Scope

- `LabOrderAssignment` operational queue
- Accept / reject / auto-reject
- Collection and visit provisioning
- Test execution lifecycle
- Out of scope: reroute procedures (not implemented)

---

## Dual Assignment Pattern

| Layer | Model | App | Purpose |
|---|---|---|---|
| Routing winner | `RoutingLabOrderAssignment` | diagnostics_engine | Marketplace audit + branch selection |
| Ops queue | `LabOrderAssignment` | labs | Lab dashboard accept/reject |

**Provisioning:** After routing, `ensure_lab_order_assignment()` creates `LabOrderAssignment` with status `PENDING`.

**File:** `labs/api/services/lab_assignment_provisioning.py`

---

## Assignment Status Flow

**File:** `labs/choices/workflow.py`

```
PENDING → ACCEPTED | REJECTED | CANCELLED
ACCEPTED → IN_PROGRESS → COMPLETED
```

Registry: [shared_docs/status_registry.md](../../status_registry.md)

---

## Accept Workflow

**Function:** `accept_assignment()` — `labs/services/workflow_transitions.py`

**Rules:**

- Only from `PENDING`
- Assignment must belong to lab user's branch
- Sets `ACCEPTED` + `accepted_at`

**Branches on `DiagnosticOrder.sample_collection_mode`:**

| Mode | Provisioning |
|---|---|
| `"home"` | `ensure_lab_collection_request()` → `LabCollectionRequest` status `PENDING` |
| `"lab"` | `LabVisitAppointment.get_or_create()` → status `PENDING` |

Test executions are **not** created at accept — only at collect/check-in.

**API:** `POST /api/labs/orders/<assignment_id>/accept/`

---

## Reject Workflow

**Function:** `reject_assignment()`

**Rules:**

- Only from `PENDING`
- Non-empty `rejection_reason` required
- Sets `REJECTED` + `rejected_at`

**API:** `POST /api/labs/orders/<assignment_id>/reject/`

**Gap:** Reject does not trigger routing reroute or emit `RoutingEvent.LAB_REJECTED`.

---

## Auto-Reject (Timeout)

**Function:** `reject_stale_pending_assignments()`

**SLA:** `LAB_ASSIGNMENT_AUTO_REJECT_MINUTES` — default **60 minutes** (`main/settings.py`)

**Behavior:**

- Rejects `PENDING` where `assigned_at < now - SLA`
- Sets `metadata.auto_rejected = True`
- Reason: `"Auto-rejected: no lab acceptance within SLA window."`

**Cron:** `python manage.py auto_reject_stale_lab_assignments`

**Gap:** Treated as ops reject only — no marketplace reroute.

---

## Home Collection Workflow

**Provisioning:** `labs/services/collection_request_provisioning.py`

- Only when `sample_collection_mode == "home"`
- Raises `ProvisioningError` if mode is lab

**State machine:** `labs/services/collection_workflow.py`

```
PENDING → ASSIGNED → IN_PROGRESS → COLLECTED | FAILED
FAILED → PENDING (retry)
```

**Collect:** `mark_collected()` → `COLLECTED` → `ensure_test_executions(..., collection_request=...)`

**APIs:** `HomeCollection*View` in `labs/api/views/home_collections.py`

**Phlebotomist rule:** Must belong to same branch for assign.

Docs: `labs/documents/HOME_COLLECTION_PROVISIONING_ARCHITECTURE.md`

---

## Branch Visit Workflow

**State machine:** `labs/services/visit_workflow.py`

```
PENDING → CONFIRMED → CHECKED_IN → COMPLETED
(+ RESCHEDULED, NO_SHOW, CANCELLED)
```

**Check-in:** `check_in_visit()` → `CHECKED_IN` → `ensure_test_executions(..., visit_appointment=...)`

**APIs:** `VisitAppointment*View` in `labs/api/views/visit_appointments.py`

---

## Test Execution

**Model:** `LabOrderTestExecution` — one per test line after collect/check-in

**Provisioning:** `labs/services/test_execution_provisioning.py`

**Requires:** Assignment status `ACCEPTED`

---

## Lab Orders List API

**Service:** `labs/api/services/lab_orders_list_service.py`

- Joins investigation urgency via `DiagnosticOrderItem.metadata_snapshot["investigation_item_id"]`
- Presenter: `lab_orders_presenter.py`

**API:** `GET /api/labs/orders/`

---

## Operational Actors

| Actor | Actions today |
|---|---|
| Lab admin | List orders, accept/reject, manage collection/visit |
| Phlebotomist | Assigned to home collection requests |
| Platform cron | Auto-reject stale assignments |
| Patient | No direct lab ops visibility |

---

## Backfill / Repair Commands

| Command | Purpose |
|---|---|
| `backfill_lab_order_assignments` | Repair missing assignments |
| `backfill_home_collection_executions` | Repair execution rows |

---

## Marketplace Impact

Lab accept/reject workflow is mature for single assignment. Missing linkage from reject/timeout back into routing engine for second attempt.

---

## Milestone 2

No changes to lab ops for read-only recommendation.

---

## Reusable Components

| Component | Path |
|---|---|
| `ensure_lab_order_assignment` | `labs/api/services/lab_assignment_provisioning.py` |
| `accept_assignment` | `labs/services/workflow_transitions.py` |
| `reject_assignment` | Same |
| `reject_stale_pending_assignments` | Same |
| `ensure_lab_collection_request` | `labs/services/collection_request_provisioning.py` |
| `mark_collected` | `labs/services/collection_workflow.py` |
| `check_in_visit` | `labs/services/visit_workflow.py` |
| `ensure_test_executions` | `labs/services/test_execution_provisioning.py` |

---

## Known Gaps

| Gap | Detail |
|---|---|
| Reject → reroute | No integration with `RoutingService` |
| Timeout → reroute | Auto-reject stops at REJECTED |
| Patient notification on routing failure | Not implemented |
| `LAB_REJECTED` routing event | Not emitted |
| Manual escalation path | No admin reroute API |
| Ops dashboard for routing history | Routing API exists; no unified ops dashboard doc'd in code |

---

## Reference

**[M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md)**

Module docs: [labs/docs/WORKFLOWS.md](../../../labs/docs/WORKFLOWS.md) · [labs/docs/BUSINESS_FLOW.md](../../../labs/docs/BUSINESS_FLOW.md)

Related: [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md) · [02_End_to_End_Workflow.md](02_End_to_End_Workflow.md)
