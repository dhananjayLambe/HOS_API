---
owner: consultations_core-team
module: consultations_core
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# API Reference — consultations_core

## Base paths

| Prefix | Purpose |
|---|---|
| `/api/consultations/` | Core consultation APIs |
| `/api/investigations/` | Investigation ordering |
| `/api/v1/prescriptions/` | Prescription CRUD |
| `/api/v1/templates/` | Consultation templates |
| `/api/v1/visits/` | Visit management |
| `/api/visits/{id}/vitals/` | Vitals capture |

## Key endpoints

| Method | Path | Purpose | Side effects |
|---|---|---|---|
| POST | End consultation | Finalize encounter | PDF, S3, WhatsApp, audit |
| GET/PATCH | Encounter/consultation | Clinical data | State via state machine only |
| POST | Investigations | Order tests | May trigger diagnostic order |
| GET | Pre-consultation templates | Dynamic forms | Cache if enabled |

See `consultations_core/api/urls.py` and related url modules.

## Errors

`CONSULTATION_ALREADY_COMPLETED`, `INVALID_ENCOUNTER_TRANSITION` — [ERRORS.md](../../shared_docs/ERRORS.md)

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

| Route | View | Source |
|---|---|---|
| `` | — | urls.py |
| `pre-consult/template/` | as_view | urls.py |
| `pre-consult/encounter/create/` | as_view | urls.py |
| `entry/resolve/` | as_view | urls.py |
| `entry/start-new-visit/` | as_view | urls.py |
| `pre-consult/encounter/<uuid:encounter_id>/section/<str:section_code>/` | as_view | urls.py |
| `pre-consult/patient/<uuid:patient_id>/previous-records/` | as_view | urls.py |
| `pre-consultation/preview/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/pre-consultation/start/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/pre-consultation/complete/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/consultation/start/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/consultation/complete/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/cancel/` | as_view | urls.py |
| `instructions/suggestions/` | as_view | urls.py |
| `clinical-templates/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/instructions/templates/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/instructions/` | as_view | urls.py |
| `instructions/<uuid:pk>/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/findings/` | as_view | urls.py |
| `findings/<uuid:pk>/` | as_view | urls.py |
| `encounter/<uuid:encounter_id>/diagnoses/custom/` | as_view | urls.py |
| `<uuid:consultation_id>/investigations/items/` | as_view | urls.py |
| `<uuid:consultation_id>/investigations/items/<uuid:item_id>/` | as_view | urls.py |
| `prescriptions/` | as_view | urls.py |
| `<uuid:consultation_id>/summary/` | as_view | urls.py |
| `<uuid:consultation_id>/summary-lite/` | as_view | urls.py |
| `<uuid:consultation_id>/summary-lite/html/` | as_view | urls.py |
| `<uuid:consultation_id>/summary-lite/pdf/` | as_view | urls.py |
| `<uuid:consultation_id>/prescription/cancel/` | as_view | urls.py |

<!-- auto-generated:api:end -->
