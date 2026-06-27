---
owner: caleder_events-team
module: caleder_events
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---


# Business Flow — caleder_events

## Purpose

Django app `caleder_events` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.

## Code layout

| Area | Location |
|---|---|
| Models | `caleder_events/models/` or `models.py` (1 module(s)) |
| API | `caleder_events/api/` |
| Services | `calendar_aggregation.py` |
| Signals | _none_ |

## Integration

See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#caleder_events) and [caleder_events/AI_CONTEXT.md](../AI_CONTEXT.md).

## API base path

Check `main/urls.py` for `/api/.../` prefix mapping to `caleder_events`.
