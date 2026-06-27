---
owner: support-team
module: support
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---


# Business Flow — support

## Purpose

Django app `support` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.

## Code layout

| Area | Location |
|---|---|
| Models | `support/models/` or `models.py` (3 module(s)) |
| API | `support/api/` |
| Services | `ticket_number_service.py` |
| Signals | _none_ |

## Integration

See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#support) and [support/AI_CONTEXT.md](../AI_CONTEXT.md).

## API base path

Check `main/urls.py` for `/api/.../` prefix mapping to `support`.
