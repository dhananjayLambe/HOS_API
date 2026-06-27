---
owner: clinic-team
module: clinic
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# API Reference — clinic

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

| Route | View | Source |
|---|---|---|
| `clinics/` | as_view | urls.py |
| `clinics/<uuid:clinic_id>/` | as_view | urls.py |
| `clinics/<uuid:clinic_id>/address/` | as_view | urls.py |
| `clinics/<uuid:clinic_id>/profile/` | as_view | urls.py |
| `clinics/<uuid:clinic_id>/schedules/` | as_view | urls.py |
| `clinics/<uuid:clinic_id>/holidays/` | as_view | urls.py |
| `clinics/<uuid:clinic_id>/holidays/<uuid:holiday_id>/` | as_view | urls.py |
| `clinics/<uuid:clinic_id>/holidays/<uuid:holiday_id>/deactivate/` | as_view | urls.py |
| `clinics/onboarding/` | as_view | urls.py |
| `clinics/list/` | as_view | urls.py |
| `clinics/create/` | as_view | urls.py |
| `clinics/<uuid:pk>/detail/` | as_view | urls.py |
| `clinics/update/<uuid:pk>/` | as_view | urls.py |
| `clinics/delete/<uuid:pk>/` | as_view | urls.py |
| `profilupdate/<uuid:clinic_id>/` | as_view | urls.py |
| `` | — | urls.py |
| `clinic-admin/register/` | as_view | urls.py |
| `clinic-admin/login/` | as_view | urls.py |
| `clinic-admin/logout/` | as_view | urls.py |
| `clinic-admin/my-clinic/` | as_view | urls.py |
| `api/clinic-admin/token/refresh/` | as_view | urls.py |
| `api/clinic-admin/token/verify/` | as_view | urls.py |

<!-- auto-generated:api:end -->
