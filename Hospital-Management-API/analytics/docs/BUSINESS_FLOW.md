---
owner: analytics-team
module: analytics
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---


# Business Flow — analytics

## Purpose

Django app `analytics` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.

## Code layout

| Area | Location |
|---|---|
| Models | `analytics/models/` or `models.py` (1 module(s)) |
| API | `analytics/api/` |
| Services | _none_ |
| Signals | _none_ |

## Integration

See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#analytics) and [analytics/AI_CONTEXT.md](../AI_CONTEXT.md).

## API base path

Check `main/urls.py` for `/api/.../` prefix mapping to `analytics`.
