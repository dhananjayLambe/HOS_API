---
owner: appointments-team
module: appointments
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Flow — appointments

Schedules doctor consultation appointments (not diagnostic lab bookings).

## Actors

Patient, doctor, clinic staff, system (slot generator).

## Models

`Appointment` — status, payment_status, doctor, patient, clinic, slot times.

## Integration

- Consumes doctor availability and clinic schedules
- Publishes status changes to queue_management
- Completed/checked-in flows into consultations_core encounter creation

Base API: `/api/appointments/`
