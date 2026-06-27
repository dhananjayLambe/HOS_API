---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Status Registry

Single source of truth for all lifecycle status enums. App docs MUST link here — never duplicate full status lists.

## Encounter Status

**Owner:** consultations_core  
**Controller:** `EncounterStateMachine` (`consultations_core/services/encounter_state_machine.py`)

| Status | Terminal | Description |
|---|---|---|
| `created` | No | Encounter initialized |
| `pre_consultation_in_progress` | No | Pre-consultation form in progress |
| `pre_consultation_completed` | No | Pre done, ready for consultation |
| `consultation_in_progress` | No | Active consultation |
| `consultation_completed` | No | Consultation ended, may close |
| `closed` | Yes | Visit fully closed |
| `cancelled` | Yes | Visit cancelled |
| `no_show` | Yes | Patient did not show |

### Allowed transitions

```
created → pre_consultation_in_progress | consultation_in_progress | cancelled | no_show
pre_consultation_in_progress → pre_consultation_completed | consultation_in_progress | cancelled
pre_consultation_completed → consultation_in_progress | cancelled
consultation_in_progress → consultation_completed | cancelled
consultation_completed → closed | cancelled
closed, cancelled, no_show → (none)
```

**Invalid:** Any reverse transition (e.g., `consultation_completed` → `consultation_in_progress`).

Legacy statuses (`pre_consultation`, `in_consultation`, `completed`) normalized via `normalize_encounter_status`.

---

## Prescription Status

**Owner:** consultations_core  
**Model:** `Prescription`

| Status | Terminal |
|---|---|
| `draft` | No |
| `finalized` | Yes |
| `cancelled` | Yes |

---

## Investigation Status

**Owner:** consultations_core

| Status | Terminal |
|---|---|
| `suggested` | No |
| `ordered` | No |
| `completed` | Yes |
| `cancelled` | Yes |

---

## Order Status (DiagnosticOrder)

**Owner:** diagnostics_engine  
**Controller:** `DiagnosticOrder.update_status()`

| Status | Terminal | Description |
|---|---|---|
| `created` | No | Cart / draft order |
| `confirmed` | No | Confirmed; test lines expanded |
| `sample_collected` | No | Sample obtained |
| `in_processing` | No | Lab processing |
| `report_ready` | No | Reports available |
| `completed` | Yes | All lines complete |
| `partial` | No | Some lines complete, some cancelled |
| `cancelled` | Yes | Order cancelled |

### Allowed transitions

```
created → confirmed | cancelled
confirmed → sample_collected | cancelled
sample_collected → in_processing
in_processing → report_ready | partial | completed | cancelled
report_ready → completed | partial
partial → completed | cancelled
completed, cancelled → (none)
```

---

## Diagnostic Order Routing Status

**Owner:** diagnostics_engine  
**Field:** `DiagnosticOrder.routing_status`

| Status | Description |
|---|---|
| `awaiting_assignment` | Waiting for routing |
| `routing_in_progress` | Routing pipeline running |
| `assigned` | Lab branch assigned |
| `routing_failed` | Routing error |
| `no_match_found` | No eligible lab |

---

## Order Test Line Status

**Owner:** diagnostics_engine

| Status | Terminal |
|---|---|
| `pending` | No |
| `scheduled` | No |
| `in_progress` | No |
| `completed` | Yes |
| `cancelled` | Yes |

---

## Report Lifecycle Status

**Owner:** diagnostics_engine

| Status | Terminal |
|---|---|
| `pending` | No |
| `in_progress` | No |
| `ready` | No |
| `delivered` | Yes |
| `rejected` | Yes |

---

## Lab Assignment Status

**Owner:** labs  
**Model:** `LabOrderAssignment`

| Status | Terminal |
|---|---|
| `PENDING` | No |
| `ACCEPTED` | No |
| `REJECTED` | Yes |
| `IN_PROGRESS` | No |
| `COMPLETED` | Yes |
| `CANCELLED` | Yes |

---

## Collection Status

**Owner:** labs  
**Controller:** `collection_workflow.py`

| Status | Terminal |
|---|---|
| `PENDING` | No |
| `ASSIGNED` | No |
| `IN_PROGRESS` | No |
| `COLLECTED` | Yes |
| `FAILED` | Yes |
| `CANCELLED` | Yes |

---

## Lab Visit Appointment Status

**Owner:** labs  
**Controller:** `visit_workflow.py`

| Status | Terminal |
|---|---|
| `PENDING` | No |
| `CONFIRMED` | No |
| `CHECKED_IN` | No |
| `COMPLETED` | Yes |
| `NO_SHOW` | Yes |
| `CANCELLED` | Yes |
| `RESCHEDULED` | No |

---

## Test Execution Status

**Owner:** labs

| Status | Terminal |
|---|---|
| `pending` | No |
| `accepted` | No |
| `scheduled` | No |
| `sample_collected` | No |
| `in_processing` | No |
| `report_ready` | No |
| `completed` | Yes |
| `cancelled` | Yes |
| `rejected` | Yes |
| `no_show` | Yes |
| `unsupported` | Yes |

---

## Appointment Status (doctor schedule)

**Owner:** appointments  
**Model:** `Appointment.status`

| Status | Terminal | Description |
|---|---|---|
| `scheduled` | No | Booked slot |
| `checked_in` | No | Patient arrived |
| `in_consultation` | No | Active consultation linked |
| `completed` | Yes | Visit done |
| `cancelled` | Yes | Cancelled |
| `no_show` | Yes | Patient did not attend |

### Allowed transitions (typical)

```
scheduled → checked_in → in_consultation → completed
scheduled → cancelled | no_show
checked_in → in_consultation | no_show
```

Legacy simplified registry also listed: scheduled → completed / cancelled / no_show (direct complete allowed in some flows).

---

## Payment Status (future)

**Owner:** TBD — not yet implemented

| Status | Notes |
|---|---|
| `pending` | Stub for future payment integration |
| `paid` | Stub |
| `refunded` | Stub |
| `failed` | Stub |

---

## Sample / Delivery Status (labs tracking)

**Owner:** labs

See `labs/choices/tracking.py`: `SampleStatus`, `DeliveryStatus` — document in [labs/docs/WORKFLOWS.md](../../labs/docs/WORKFLOWS.md).
