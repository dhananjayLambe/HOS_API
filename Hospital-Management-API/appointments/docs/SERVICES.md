---
owner: appointments-team
module: appointments
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Services — appointments

| Area | Responsibility |
|---|---|
| Slot generation | `AppointmentSlotView` — uses doctor working hours + clinic |
| Booking validation | Lead buffer, max days, conflict detection |
| Walk-in | `WalkInAppointmentCreateView` — helpdesk flow |
| Reschedule/cancel | Status transitions with history |
| Metrics | `AppointmentTodayMetricsView` |

Service logic primarily in `api/views/` and `api/serializers/appointment.py`.

## Dependencies

doctor (availability), patient_account, clinic, queue_management.
