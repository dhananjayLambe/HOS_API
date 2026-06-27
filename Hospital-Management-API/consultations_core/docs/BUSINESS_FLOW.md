---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Flow — consultations_core

## Why this module exists

Clinical backbone for DoctorPro EMR: one visit = one encounter = one immutable clinical record after completion.

## Core philosophy

- **One Visit = One Encounter**
- **Navigation ≠ State Change** — only explicit buttons change `Encounter.status`
- **State is never inferred from data**
- Single source of truth: `Encounter.status`

Migrated from `support_documents/consultaiton_all_details.txt`.

## Actors

| Actor | Role |
|---|---|
| Doctor | Pre-consultation, consultation, end visit |
| Helpdesk | Patient check-in, encounter creation |
| Patient | Pre-consultation data (where enabled) |
| System | State machine, audit, PDF, WhatsApp |

## Entry logic (patient selected)

| Case | Behavior |
|---|---|
| Active encounter exists (created / pre_in_progress / consultation_in_progress) | Auto-resume — no popup |
| Last encounter completed | Show "Start New Visit" |
| No encounter | Create new → redirect to pre-consultation |

## Pre-consultation UX

Allowed when: `created` or `pre_consultation_in_progress`

Buttons: Save Draft, Complete & Start Consultation, Start New Visit

On "Complete & Start Consultation": → `pre_consultation_completed` → redirect → `consultation_in_progress`

If consultation already started: pre becomes read-only with lock banner.

## Consultation UX

Allowed when: `consultation_in_progress`

Buttons: Save Draft, End Consultation, Start New Visit, View Pre (popup)

## End consultation

Confirmation popup → `consultation_completed` → lock encounter → PDF → S3 → WhatsApp (async)

## Investigation handoff

Doctor orders investigation → status `ordered` → `POST /api/diagnostics/orders/create-from-consultation/` creates commercial order in diagnostics_engine.

## Edge cases

- Cancel from any active state → `cancelled` (terminal)
- No-show from `created` → `no_show`
- Legacy status values normalized on read

## Invalid

- Reverse transitions (e.g., completed → in_progress)
- Automatic encounter creation on navigation
- State rollback when validation fails
