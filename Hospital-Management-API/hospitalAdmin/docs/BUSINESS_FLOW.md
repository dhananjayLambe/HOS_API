---
owner: hospitalAdmin-team
module: hospitalAdmin
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---


# Business Flow — hospitalAdmin

## Purpose

Django app `hospitalAdmin` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.

## Code layout

| Area | Location |
|---|---|
| Models | `hospitalAdmin/models/` or `models.py` (1 module(s)) |
| API | `hospitalAdmin/api/` |
| Services | _none_ |
| Signals | _none_ |

## Integration

See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#hospitalAdmin) and [hospitalAdmin/AI_CONTEXT.md](../AI_CONTEXT.md).

## API base path

Check `main/urls.py` for `/api/.../` prefix mapping to `hospitalAdmin`.
