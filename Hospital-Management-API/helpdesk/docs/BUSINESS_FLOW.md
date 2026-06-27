---
owner: helpdesk-team
module: helpdesk
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---


# Business Flow — helpdesk

## Purpose

Django app `helpdesk` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.

## Code layout

| Area | Location |
|---|---|
| Models | `helpdesk/models/` or `models.py` (1 module(s)) |
| API | `helpdesk/api/` |
| Services | _none_ |
| Signals | _none_ |

## Integration

See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#helpdesk) and [helpdesk/AI_CONTEXT.md](../AI_CONTEXT.md).

## API base path

Check `main/urls.py` for `/api/.../` prefix mapping to `helpdesk`.
