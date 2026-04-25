# Helpdesk queue, encounter, and vitals continuity

## Goal

Helpdesk captures vitals on the **same** `ClinicalEncounter` the doctor later opens, so **`visit_id` (encounter UUID) and `visit_pnr` stay identical**.

## Backend flow

1. **Queue check-in** (`POST /api/queue/check-in/`) resolves or creates an active encounter via `EncounterService.get_or_create_encounter`, updates `doctor` / `appointment` on the encounter when reusing an active row, and stores `Queue.encounter`.
2. **Queue list** (`GET /api/queue/doctor/<doctor>/<clinic>/`) returns `visit_id` from `queue.encounter_id` plus vitals preview from `PreConsultationVitals` JSON when present.
3. **Helpdesk vitals** (`POST /api/visits/<visit_id>/vitals/`) upserts `PreConsultationVitals`, sets linked queue rows to `vitals_done` when data is meaningful, and moves encounter `created` → `pre_consultation_in_progress`.
4. **Queue start** (`PATCH /api/queue/start/`) sets queue `in_consultation` and calls `start_consultation_from_queue_entry`, which creates `Consultation` when needed (mirrors doctor start intent) so encounter becomes `consultation_in_progress`.

## Doctor UI contract

Doctor flows should continue to use **`encounter_id`** from queue (`visit_id`) for:

- Pre-consult preview: `GET /api/consultations/pre-consultation/preview/?encounter_id=...`
- Start consultation: `POST /api/consultations/encounter/<encounter_id>/consultation/start/` (doctor permission)

Helpdesk uses the same encounter id for vitals as returned on check-in / queue list.

## Skip vs vitals-done

If helpdesk saved meaningful vitals, `PreConsultation.is_skipped` is **not** set when queue start creates the consultation (see `queue_consultation_bridge`).
