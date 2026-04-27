# Encounter Lifecycle Scenario Catalog

## Purpose

Executable scenario catalog for encounter lifecycle behavior across helpdesk and doctor flows.

## Core Scenarios

1. **First helpdesk check-in**
   - Action: helpdesk checks in patient with no active encounter
   - Expected: new encounter in `created`, `visit_pnr` generated and returned, queue row links same encounter

2. **Repeat check-in / retry**
   - Action: duplicate check-in request for same patient+clinic
   - Expected: existing active encounter reused, same `encounter_id` and `visit_pnr`, no duplicate active encounter

3. **Helpdesk vitals before doctor**
   - Action: post meaningful vitals to visit endpoint
   - Expected: encounter transitions `created` -> `pre_consultation_in_progress`

4. **Doctor starts consultation without completed pre-consult**
   - Action: start consultation on active encounter
   - Expected: `get_or_create_preconsultation_for_start_safe` ensures a `PreConsultation` row exists; if not completed **and** vitals are **not** meaningful, `is_skipped=True` is set on pre-consult before `Consultation` is created (see `consultation_start_service.start_consultation_for_encounter`). Consultation created once; encounter `consultation_in_progress`.

5. **Dual start race (helpdesk + doctor)**
   - Action: both start endpoints fire concurrently for same encounter
   - Expected: one consultation row total, both calls succeed, one may return `already_started=true`

6. **Pre-consult write after consultation start**
   - Action: save vitals/pre-consult section after consultation started
   - Expected: blocked by status and lock enforcement

7. **Consultation finalize**
   - Action: doctor finalizes consultation
   - Expected: `ended_at` set, `is_finalized=True`, encounter `consultation_completed`

8. **Consultation mutate after finalize**
   - Action: update finalized consultation
   - Expected: rejected by model validation

9. **Cancelled/no-show path**
   - Action: attempt write APIs after encounter becomes `cancelled` or `no_show`
   - Expected: all clinical writes rejected

10. **Legacy status rows**
    - Action: fetch/transition rows containing `pre_consultation`, `in_consultation`, or `completed`
    - Expected: normalized behavior to canonical equivalents

## Operational Checks

- queue `visit_id` always equals `encounter.id`
- helpdesk PNR display remains stable from check-in through consultation
- status logs show valid transition pairs only

## Extended scenarios (S21-S25)

21. **Doctor resolve / search returns active encounter (`S21`)**
    - Action: doctor uses entry resolve (or patient search tied to encounter) for a patient who already has an active encounter from helpdesk check-in
    - Expected: same `encounter_id` and `visit_pnr` as queue; no second active encounter

22. **Queue removed, encounter still valid (`S22`)**
    - Action: helpdesk skip/remove from queue; doctor opens visit by `encounter_id` or resolve
    - Expected: encounter remains loadable; clinical data intact. **Queue is not source of truth** — absence from helpdesk list must not imply encounter deleted

23. **Vitals while doctor starts consultation — race (`S23`)**
    - Action: concurrent helpdesk `POST .../vitals/` and doctor consultation start on same encounter
    - Expected: once consultation exists, pre-consult is locked; losing vitals write returns read-only / rejected; no corrupt partial write after lock

24. **PNR consistency across surfaces (`S24`)**
    - Action: compare `visit_pnr` from helpdesk queue API, encounter detail API, and doctor consultation UI
    - Expected: identical `visit_pnr` everywhere it is shown

25. **Partial vitals (`S25`)**
    - Action: save subset of vitals (e.g. BP only, or only one BP component)
    - Expected: meaningfulness follows `vitals_data_is_meaningful` (both BP numbers required for BP to count). Meaningful partial → may transition encounter toward pre-consult and mark queue `vitals_done`; sub-meaningful → response `WAITING`, encounter may stay `created`. Pre-consult “completed” is separate from “vitals_done” queue flag.

## Doctor start — encounter vs queue wording (`S05`)

- **Encounter-level** (canonical): consultation start is valid from encounter states such as `created`, `pre_consultation_in_progress`, `pre_consultation_completed` (subject to state machine rules).
- **Queue-level** API: `PATCH /api/queue/start/` only considers queue rows in `waiting` or `vitals_done` — operational shorthand, not the full encounter state enum.

## Doctor `start-new-visit` policy (`S11`)

- **Current implementation**: `StartNewVisitAPIView` allows doctors to start a new visit (may close/cancel prior active encounter per view logic).
- **Strict helpdesk-only policy** conflicts with that behavior — product must choose: disable endpoint, or **feature-flag** small-clinic doctor entry, then align tests and UAT to the decision.

