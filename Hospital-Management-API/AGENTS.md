---
owner: platform-team
module: Hospital-Management-API
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# AGENTS.md — Cursor / AI Orientation

DoctorProCare Hospital-Management-API backend.

## Before editing any app

1. Read [`shared_docs/glossary/healthcare_terms.md`](shared_docs/glossary/healthcare_terms.md) for term definitions
2. Read [`shared_docs/INVARIANTS.md`](shared_docs/INVARIANTS.md)
3. Read `{app}/AI_CONTEXT.md` for the app you are modifying
4. Read relevant `{app}/docs/BUSINESS_FLOW.md` and layer file (MODELS, API, WORKFLOWS)

## App tiers

| Tier | Apps | Priority docs |
|---|---|---|
| 1 | diagnostics_engine, consultations_core, labs, doctor | Full docs + sequence diagrams |
| 2 | appointments, notifications, patient_account, clinic, queue_management, medicines | WORKFLOWS + API |
| 3+ | Others | Mandatory 5 files minimum |

## Shared registries (never duplicate locally)

- Status: [`shared_docs/status_registry.md`](shared_docs/status_registry.md)
- Ownership: [`shared_docs/ownership.md`](shared_docs/ownership.md)
- Config: [`shared_docs/CONFIGURATION.md`](shared_docs/CONFIGURATION.md)
- Errors: [`shared_docs/ERRORS.md`](shared_docs/ERRORS.md)
- Patient journey: [`shared_docs/architecture/patient_journey.md`](shared_docs/architecture/patient_journey.md)

## Key invariants (never violate)

- INV-003: Completed consultation cannot revert
- INV-005: Reports immutable after delivery
- INV-007: Upload APIs use `report_id`, not assignment `task_id`
- INV-008: Encounter status is explicit — never inferred from form data

## Planning vs living docs

- Plans: `HOS_API/docs/backend/Hospital-Management-API/`
- Living: `{app}/docs/` — update with code changes

## URL map

`main/urls.py` — `/api/consultations/`, `/api/diagnostics/`, `/api/labs/`, `/api/appointments/`, etc.

## Scaffolding

```bash
python3 scripts/docs/scaffold_app_docs.py --all-missing --tier full
```
