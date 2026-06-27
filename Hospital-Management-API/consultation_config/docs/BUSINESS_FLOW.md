---
owner: consultation_config-team
module: consultation_config
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---


# Business Flow — consultation_config

## Purpose

Django app `consultation_config` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.

## Code layout

| Area | Location |
|---|---|
| Models | `consultation_config/models/` or `models.py` (0 module(s)) |
| API | `consultation_config/api/` |
| Services | `schema_builder.py` |
| Signals | _none_ |

## Integration

See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#consultation_config) and [consultation_config/AI_CONTEXT.md](../AI_CONTEXT.md).

## API base path

Check `main/urls.py` for `/api/.../` prefix mapping to `consultation_config`.
