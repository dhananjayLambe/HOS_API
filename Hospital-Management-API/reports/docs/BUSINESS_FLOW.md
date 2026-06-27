---
owner: reports-team
module: reports
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---


# Business Flow — reports

## Purpose

Django app `reports` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.

## Code layout

| Area | Location |
|---|---|
| Models | `reports/models/` or `models.py` (2 module(s)) |
| API | `reports/api/` |
| Services | `appointment_summary_service.py`, `appointment_trend_service.py`, `doctor_load_service.py`, `operational_insight_service.py`, `patient_flow_service.py` |
| Signals | `signals.py` |

## Integration

See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#reports) and [reports/AI_CONTEXT.md](../AI_CONTEXT.md).

## API base path

Check `main/urls.py` for `/api/.../` prefix mapping to `reports`.
