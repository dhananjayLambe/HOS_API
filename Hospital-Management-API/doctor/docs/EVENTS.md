---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Events — doctor

See [event_registry.md](../../shared_docs/event_registry.md).

## Published

| Event | Trigger | Subscribers |
|---|---|---|
| DOCTOR_PROFILE_UPDATED | `signals.py` on profile save | Cache, dashboard |

## Consumed

None directly — doctor is upstream for appointments and consultations.

## OPD events

Check-in/check-out API calls propagate to queue_management (synchronous HTTP, not Django signal).
