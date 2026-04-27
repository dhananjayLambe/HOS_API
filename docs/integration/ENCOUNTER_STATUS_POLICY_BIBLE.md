# Encounter Status Policy Bible

## Scope

This document is the authoritative status policy for the shared helpdesk + doctor lifecycle using:

- `ClinicalEncounter`
- `PreConsultation`
- `Consultation`

## Canonical Statuses (write path)

- `created`
- `pre_consultation_in_progress`
- `pre_consultation_completed`
- `consultation_in_progress`
- `consultation_completed`
- `closed`
- `cancelled`
- `no_show`

Legacy values are read-only compatibility aliases:

- `pre_consultation` -> `pre_consultation_in_progress`
- `in_consultation` -> `consultation_in_progress`
- `completed` -> `consultation_completed`

## Ownership Rules

- **Helpdesk owns encounter creation/reuse**
  - `POST /api/queue/check-in/`
  - New encounter starts in `created`
  - `visit_pnr` is generated once and remains stable
- **Doctor/helpdesk both can trigger consultation start**
  - Doctor: `POST /api/consultations/encounter/<encounter_id>/consultation/start/`
  - Helpdesk queue start: `PATCH /api/queue/start/`
  - Both routes use one shared transactional start service
- **Doctor owns consultation completion**
  - `POST /api/consultations/encounter/<encounter_id>/consultation/complete/`

## Hard Invariants

- One active encounter per `patient_account + clinic`
- One consultation per encounter
- Pre-consultation locks when consultation starts
- Finalized consultation is immutable
- Vitals and pre-consultation stay on the same encounter id/PNR
- Encounter status changes only through state machine service paths

## Race Safety Protocol

When helpdesk and doctor start consultation concurrently:

- lock encounter row (`select_for_update`)
- check existing consultation inside lock
- create once if missing
- race loser returns idempotent success with `already_started=true`

Result: both UIs converge to the same active consultation.

