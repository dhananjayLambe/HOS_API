---
owner: appointments-team
module: appointments
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Events — appointments

## Published

| Event | Trigger | Consumers |
|---|---|---|
| APPOINTMENT_STATUS_CHANGED | Status update API | queue_management |
| APPOINTMENT_CHECKED_IN | Check-in API | consultations_core (encounter) |

## Models

`Appointment`, `AppointmentHistory` — audit trail on status changes.

## Integration

Check-in comment in urls.py: Helpdesk → BFF → Django → Encounter Created.
