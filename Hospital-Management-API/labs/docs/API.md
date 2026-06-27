---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# API Reference — labs

Base: `/api/labs/`

## Key areas

| Area | Purpose |
|---|---|
| Lab auth / registration | Lab user onboarding |
| Assignments | Accept/reject order assignments |
| Collection | Home collection workflow APIs |
| Visits | Branch visit scheduling/check-in |
| Pricing | Branch service/package pricing catalog |
| Reports | Coordination with diagnostics upload (report_id) |

See `labs/api/urls.py` for full route list. Permissions in `labs/api/permissions.py`.

## Side effects

- Accept assignment → creates logistics row + may notify diagnostics_engine
- Check-in visit → provisions test executions
- Collection complete → updates diagnostics order status

## Errors

`LAB_ASSIGNMENT_REJECTED`, `COLLECTION_FAILED` — [ERRORS.md](../../shared_docs/ERRORS.md)

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

| Route | View | Source |
|---|---|---|
| `` | — | urls.py |
| `investigations/` | — | urls.py |
| `onboarding/` | as_view | urls.py |
| `me/` | as_view | urls.py |
| `orders/` | as_view | urls.py |
| `orders/assignments/<uuid:assignment_id>/` | as_view | urls.py |
| `orders/<uuid:assignment_id>/accept/` | as_view | urls.py |
| `orders/<uuid:assignment_id>/reject/` | as_view | urls.py |
| `home-collections/` | as_view | urls.py |
| `home-collections/summary/` | as_view | urls.py |
| `phlebotomists/` | as_view | urls.py |
| `home-collections/<uuid:collection_id>/assign/` | as_view | urls.py |
| `home-collections/<uuid:collection_id>/start/` | as_view | urls.py |
| `home-collections/<uuid:collection_id>/collect/` | as_view | urls.py |
| `home-collections/<uuid:collection_id>/fail/` | as_view | urls.py |
| `home-collections/<uuid:collection_id>/retry/` | as_view | urls.py |
| `pricing/summary/` | as_view | urls.py |
| `pricing/services/` | as_view | urls.py |
| `pricing/packages/` | as_view | urls.py |
| `visit-appointments/summary/` | as_view | urls.py |
| `visit-appointments/` | as_view | urls.py |
| `visit-appointments/<uuid:visit_id>/confirm/` | as_view | urls.py |
| `visit-appointments/<uuid:visit_id>/check-in/` | as_view | urls.py |
| `visit-appointments/<uuid:visit_id>/complete/` | as_view | urls.py |
| `visit-appointments/<uuid:visit_id>/no-show/` | as_view | urls.py |
| `visit-appointments/<uuid:visit_id>/reschedule/` | as_view | urls.py |

<!-- auto-generated:api:end -->
