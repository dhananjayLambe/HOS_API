---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Flow — doctor

Doctor identity, credentials, and scheduling for the EMR platform.

## Why this module exists

Owns the doctor entity: profile, KYC, specializations, fees, working hours, and OPD availability consumed by appointments and consultations.

## Actors

| Actor | Actions |
|---|---|
| Doctor | Onboard, manage profile, check in OPD, set availability |
| Admin | Verify KYC, manage doctor records |
| Helpdesk | Assist registration |
| System | ID generation, dashboard metrics |

## Integration

- **appointments** — slot generation from working hours
- **consultations_core** — doctor FK on encounters
- **clinic** — clinic affiliation
- **queue_management** — OPD check-in sync

## Entry / exit

- Entry: registration / helpdesk approval
- Active: KYC verified, profile complete
- Exit: deactivation (soft) — no hard delete of clinical history
