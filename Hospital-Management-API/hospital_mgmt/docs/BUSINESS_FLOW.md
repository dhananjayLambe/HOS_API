---
owner: hospital_mgmt-team
module: hospital_mgmt
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---


# Business Flow — hospital_mgmt

## Purpose

Django app `hospital_mgmt` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.

## Code layout

| Area | Location |
|---|---|
| Models | `hospital_mgmt/models/` or `models.py` (1 module(s)) |
| API | `hospital_mgmt/api/` |
| Services | _none_ |
| Signals | _none_ |

## Integration

See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#hospital_mgmt) and [hospital_mgmt/AI_CONTEXT.md](../AI_CONTEXT.md).

## API base path

Check `main/urls.py` for `/api/.../` prefix mapping to `hospital_mgmt`.
