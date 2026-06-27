---
owner: patient_account-team
module: patient_account
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Flow — patient_account

## Purpose

Canonical patient identity: registration, profiles, linkage to `account.User`, patient ID generation.

## Actors

Patient (self-register), helpdesk, admin, doctors (read linked patients).

## Key flows

1. **Registration** — create User + PatientProfile + PatientAccount
2. **Profile update** — editable fields except DOB (INV-009)
3. **Lookup** — staff search for booking/consultation

## Signals

`signals.py` publishes PATIENT_CREATED / PATIENT_UPDATED — see [event_registry.md](../../shared_docs/event_registry.md).

## Integration

All clinical apps FK to `PatientProfile`.

Base API: `/api/patients/`
