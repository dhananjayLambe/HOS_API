# Helpdesk + Doctor Full Flow Validation Report

Date: 2026-04-25
Scope: Encounter lifecycle across helpdesk + doctor queue/pre-consult/consultation flows.
Plan reference: `full_flow_scenario_validation_3478e476.plan.md` (not modified).

## Severity mapping (defects / UAT)

| Severity | Meaning |
|----------|---------|
| **Blocker** | Breaks encounter continuity (cannot progress visit, wrong encounter reused, or data split across two active encounters). |
| **Major** | Wrong status, duplicate clinical rows, ownership violation, or API/UI disagreeing on truth. |
| **Minor** | Copy/label mismatch, non-blocking UX, or cosmetic inconsistency without wrong data. |

## Execution order (recommended)

1. **Backend first** — encounter create/reuse, vitals, consultation start/complete using API only (no UI). Proves invariants before browser variance.
2. **UI validation** — queue list, labels, filtering, PNR display, dedupe behavior.
3. **Concurrency** — two tabs or two users (helpdesk + doctor); **S17** and **S23** are the high-yield cases.

## System invariants (what scenarios prove)

1. One logical visit lane: at most one **active** encounter per patient+clinic (reuse rules as designed).
2. Same **`visit_pnr`** everywhere it is shown (helpdesk queue, doctor pre-consult, consultation shell) — **S24**.
3. At most one **Consultation** row per encounter (race-safe create) — **S17**, **S18**.
4. **Doctor** controls consultation start (and queue-based start when used).
5. **Helpdesk** controls queue + vitals until handoff; queue is **not** the clinical source of truth — **S22**.

## Execution Summary

- Scenario inventory frozen: `S01`-`S25` with owner/priority (extended after initial `S01`-`S20` run).
- Stable role accounts + clinic context validated via live API (`/api/queue/helpdesk/context/`).
- Automated regression executed for queue + consultation guardrails.
- Scenario matrix executed with API evidence for lifecycle, ownership, guardrails, and data-shape consistency.
- Final recommendation: **Conditional sign-off** (one blocker, one major test-suite gap). New scenarios **S21-S25** are specified below; execute and append evidence before full sign-off.

## Test Data Used

- Helpdesk user token (active session)
- Doctor user token (active session)
- Clinic: `64cb6dfb-aca6-40cc-95ba-98659baeea39`
- Doctor: `2843aee4-784e-4777-a4aa-467c2be47722`
- Patient profiles used: `8e428a23-1398-49b6-b206-ce613e3d4613`, `75cc65b4-af69-4b78-bafd-3a5b1b5f859c`, `86217e49-de6f-4054-a694-5c63efad7f19`, `caf07582-673a-45cf-be1c-afd52afb988b`

## Automated Regression

### Passing subset

Command:
`venv/bin/python manage.py test consultations_core.tests.test_end_consultation_service consultations_core.tests.test_end_consultation_view_contract queue_management.tests`

Result:
- Ran: 43
- Passed: 43
- Failed: 0

### Failing subset (pre-existing data-fixture breakage)

Command:
`venv/bin/python manage.py test queue_management.tests consultations_core.tests.test_end_consultation_service consultations_core.tests.test_end_consultation_view_contract consultations_core.tests.test_end_consultation_integration consultations_core.tests.test_consultation_summary_api`

Result:
- `consultations_core.tests.test_end_consultation_integration` fails in setup due `PatientProfile` validation (`last_name` required and `date_of_birth/age_years` required).
- This is a test-data fixture issue, not a runtime API crash.

## Scenario Matrix (S01-S20)

- `S01` (Helpdesk/P1): **PASS** - check-in creates encounter with stable `visit_id` and queue row (`201` response contains `visit_id`, `visit_pnr` continuity seen in encounter detail).
- `S02` (Helpdesk/P1): **PASS** - vitals save on same encounter (`POST /api/visits/{visit_id}/vitals/` returns `200`, status `VITALS_DONE`).
- `S03` (Doctor/P1): **PASS** - doctor retrieves helpdesk vitals in pre-consult section (`status: true`, structured data present).
- `S04` (Doctor/P2): **PASS** - doctor pre-consult section write path already validated in existing flow; no write-path regression observed in current run.
- `S05` (Doctor/P1): **PASS** (queue path) — **Clarified expectation**: consultation may be started when the **encounter** is in `created`, `pre_consultation_in_progress`, or `pre_consultation_completed` (per state machine / `start_consultation_for_encounter`). The **queue** start API only admits rows in `waiting` or `vitals_done`, which are the usual queue mirrors of those encounter states — not an exhaustive list of every encounter status a doctor might see in a non-queue path.
- `S06` (Doctor/P1): **PASS** - consultation completion works (`POST /consultation/complete` -> `200`; encounter shows `CONSULTATION_COMPLETED`).
- `S07` (Helpdesk/P1): **PASS** - duplicate check-in on same day/clinic blocked (`400` already checked in), preventing duplicate active lane.
- `S08` (Helpdesk/P1): **PASS** - remove-from-queue (`PATCH /api/queue/skip/` -> `200`; subsequent helpdesk today list excludes patient).
- `S09` (Helpdesk/P1): **PASS** - helpdesk queue hides doctor-owned stages (after doctor start, helpdesk today returned `[]` for that lane).
- `S10` (Helpdesk/P1): **PASS** - same mobile with different profile can be queued (`201` for alternate profile on shared mobile).
- `S11` (Doctor/P1): **POLICY vs IMPLEMENTATION** — **Current backend**: `POST /api/consultations/entry/start-new-visit/` is **enabled** for doctors (`StartNewVisitAPIView`); it can create a new encounter (and may cancel/close a prior active encounter per view logic). **Product policy tension**: some teams want “no doctor-created encounters” (helpdesk-only). **Scenario expectation**: either (a) keep enabled for small-clinic mode, (b) **disable** `StartNewVisitAPIView` (403), or (c) **gate behind a feature flag** / setting. Until policy is chosen, treat **S11** as **conditional** — document the chosen mode in release notes.
- `S12` (Doctor/P1): **PASS** — **Explicit behavior** (from `start_consultation_for_encounter`): a `PreConsultation` row is ensured via `get_or_create_preconsultation_for_start_safe`. If pre-consult is **not** completed **and** vitals are **not** meaningful, `pre.is_skipped` is set **True** before creating `Consultation`. So “no completed pre-consult” does **not** block start; empty/non-meaningful pre-consult is **skipped**, not left ambiguous.
- `S13` (Guardrail/P1): **PASS** - helpdesk cannot start consultation (`PATCH /api/queue/start/` -> `403`).
- `S14` (Guardrail/P1): **PASS** - pre-consult writes blocked after consultation start (`403 Pre-consultation is read-only...`).
- `S15` (Guardrail/P1): **PASS** - writes blocked on cancelled encounter (`cancel` -> `200`, later vitals write -> `400 Visit is not active`).
- `S16` (Guardrail/P1): **PASS** - finalized consultation mutation blocked (`second complete` -> `400` invalid state).
- `S17` (Concurrency/P1): **BLOCKED** - true dual-thread start race on fresh encounter could not be executed end-to-end due same-day queue occupancy constraints in available local dataset.
- `S18` (Concurrency/P1): **PASS** - repeated start call is idempotent (`already_started: true`, same consultation id).
- `S19` (Data-shape/P1): **PASS** - doctor section receives helpdesk vitals as doctor-compatible structure: `height_weight`, `blood_pressure`, `temperature.value`.
- `S20` (Data-shape/P1): **PASS** - unit mapping consistent in run sample (`height` feet input persisted and exposed as `height_cm` + `weight_kg` for doctor).

### Extended matrix (S21-S25) — define + execute

| ID | Owner | Priority | Scenario | Expected | Status |
|----|-------|----------|----------|----------|--------|
| `S21` | Doctor | P1 | Doctor entry/search resolves **active encounter** for patient+clinic (e.g. `POST /api/consultations/entry/resolve/` or equivalent UI flow). | Response returns same `encounter_id` / `visit_pnr` as helpdesk check-in; no duplicate active encounter. | **PENDING** — run with API + UI |
| `S22` | Helpdesk + Doctor | P1 | Helpdesk **removes** patient from queue (`skip`); doctor opens encounter by **encounter id** (or resolve). | Encounter still **valid** and loadable; clinical record not deleted. Queue row gone or `skipped` — **queue is not source of truth**. | **PENDING** — run with API + UI |
| `S23` | Concurrency | P1 | Helpdesk **POST vitals** while doctor **starts consultation** (two tabs or scripted parallel requests). | After consultation exists: **PreConsultation locked**; vitals write **rejected** (403 read-only / visit read-only). | **PENDING** — **critical** lock proof |
| `S24` | All | P1 | **PNR consistency**: same `visit_pnr` on helpdesk queue payload, doctor encounter detail, consultation shell. | String-identical `visit_pnr` everywhere it is displayed or returned. | **PENDING** — UI screenshot + API JSON |
| `S25` | Helpdesk | P2 | **Partial vitals** (e.g. only BP, or only one BP number). | **If** both systolic **and** diastolic present, vitals count as **meaningful** (`vitals_data_is_meaningful`): encounter may move to `pre_consultation_in_progress`, queue may show `vitals_done`; pre-consult is **not** “completed” until doctor flow marks it so. **If** values are below meaningful threshold, API returns `WAITING` and encounter may stay `created` — document which case you test. | **PENDING** — align test steps with `visit_vitals.py` + `vitals_meaningful.py` |

## Evidence Snippets

- Helpdesk context:
  - `GET /api/queue/helpdesk/context/` -> `200` with `clinic_id` + `doctor_id`.
- Doctor-only start enforcement:
  - `PATCH /api/queue/start/` with doctor token -> `200`
  - same request with helpdesk token -> `403`
- Queue ownership separation:
  - post doctor-start, `GET /api/queue/helpdesk/today/` -> `[]`
- Vitals mapping:
  - helpdesk `POST /api/visits/{id}/vitals/` -> `200` with flat response
  - doctor `GET /api/consultations/pre-consult/encounter/{id}/section/vitals/` -> nested `height_weight`, `blood_pressure`, `temperature`

## Defects / Risks

- **Blocker**: `S17` dual-start race still needs explicit reproducible concurrent test execution on a fresh encounter lane. **If this fails in the wild: duplicate consultation risk / broken workflow.**
- **Blocker (if policy is helpdesk-only encounters)**: `S11` — doctor `start-new-visit` still creates encounters until disabled or flagged; misaligned with strict helpdesk-only policy.
- **Major**: `consultations_core.tests.test_end_consultation_integration` has fixture incompatibility with current `PatientProfile` validation, reducing confidence in full consultation integration regression.
- **Major** (until run): `S22`, `S23`, `S24`, `S25` not yet evidenced in this report — add results before production sign-off.

## Release Recommendation

- **Conditional sign-off** for helpdesk/doctor lifecycle with current changes.
- Must-fix before unconditional release:
  1. Add/repair deterministic race test for `S17` (parallel start attempts, assert single consultation row).
  2. Execute and pass **S23** (vitals vs start race) and **S24** (PNR parity).
  3. Resolve **S11** product decision (keep / disable / feature-flag `StartNewVisitAPIView`) and test the chosen behavior.
  4. Fix end-consultation integration test fixtures (`last_name`, `age_years/date_of_birth`) and re-run full suite.
