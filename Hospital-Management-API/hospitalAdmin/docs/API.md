---
owner: hospitalAdmin-team
module: hospitalAdmin
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# API Reference — hospitalAdmin

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

| Route | View | Source |
|---|---|---|
| `login/` | as_view | urls.py |
| `logout/` | as_view | urls.py |
| `token/refresh/` | as_view | urls.py |
| `token/verify/` | as_view | urls.py |
| `doctors/pending/` | as_view | urls.py |
| `approve/doctors/<uuid:doctor_id>/` | as_view | urls.py |
| `approve/patients/` | as_view | urls.py |
| `approve/patient/<uuid:pk>/` | as_view | urls.py |
| `approve/appointments/` | as_view | urls.py |
| `approve/appointment/<int:pk>` | as_view | urls.py |
| `doctor/registration/` | as_view | urls.py |
| `doctors/` | as_view | urls.py |
| `doctor/<uuid:pk>/` | as_view | urls.py |
| `patient/registration/` | as_view | urls.py |
| `patients/` | as_view | urls.py |
| `patient/<uuid:pk>/` | as_view | urls.py |
| `patient/<uuid:pk>/history/` | as_view | urls.py |
| `patient/<uuid:pk>/history/<int:hid>/` | as_view | urls.py |
| `appointments/` | as_view | urls.py |
| `appointment/<int:pk>/` | as_view | urls.py |
| `` | — | urls.py |

<!-- auto-generated:api:end -->
