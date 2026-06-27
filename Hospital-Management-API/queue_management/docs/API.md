---
owner: queue_management-team
module: queue_management
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# API Reference — queue_management

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

| Route | View | Source |
|---|---|---|
| `check-in/` | as_view | urls.py |
| `doctor/<uuid:doctor_id>/<uuid:clinic_id>/` | as_view | urls.py |
| `helpdesk/today/` | as_view | urls.py |
| `helpdesk/context/` | as_view | urls.py |
| `start/` | as_view | urls.py |
| `complete/` | as_view | urls.py |
| `skip/` | as_view | urls.py |
| `urgent/` | as_view | urls.py |
| `queue-details/` | as_view | urls.py |
| `update-position/<uuid:queue_id>/` | as_view | urls.py |
| `reorder/` | as_view | urls.py |
| `not-available/<uuid:id>/` | as_view | urls.py |
| `queue-cancel/<uuid:id>/` | as_view | urls.py |
| `patient-status/<uuid:id>/` | as_view | urls.py |
| `patient-cancel/<uuid:id>/` | as_view | urls.py |

<!-- auto-generated:api:end -->
