---
owner: appointments-team
module: appointments
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# API Reference — appointments

Base path: `/api/appointments/`  
Authentication: JWT.

## Key endpoints

| Route | Purpose |
|---|---|
| `POST /` | Create appointment |
| `GET detail/` | Appointment detail |
| `POST <pk>/check-in/` | Check in → queue / encounter |
| `POST <pk>/cancel/` | Cancel appointment |
| `POST <pk>/reschedule/` | Reschedule slot |
| `GET slots/` | Available slots (throttled) |
| `POST walk-in/` | Walk-in booking |
| `GET patient-appointments/` | Patient list |
| `GET doctor-appointments/` | Doctor list |
| `GET calendar-view/` | Doctor calendar |
| `GET metrics/today/` | Today's metrics |

## Config

`MAX_BOOKING_DAYS`, `BOOKING_SLOT_LEAD_BUFFER_MINUTES`, `APPOINTMENT_SLOTS_THROTTLE` — [CONFIGURATION.md](../../shared_docs/CONFIGURATION.md).

## Side effects

Check-in triggers queue_management and may create/resume consultations_core encounter.

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

| Route | View | Source |
|---|---|---|
| `<uuid:pk>/reschedule/` | as_view | urls.py |
| `<uuid:pk>/cancel/` | as_view | urls.py |
| `<uuid:pk>/check-in/` | as_view | urls.py |
| `` | as_view | urls.py |
| `detail/` | as_view | urls.py |
| `patient-appointments/` | as_view | urls.py |
| `doctor-appointments/` | as_view | urls.py |
| `slots/` | as_view | urls.py |
| `history/` | as_view | urls.py |
| `update-status/` | as_view | urls.py |
| `walk-in/` | as_view | urls.py |
| `metrics/today/` | as_view | urls.py |
| `calendar-view/` | as_view | urls.py |

<!-- auto-generated:api:end -->
