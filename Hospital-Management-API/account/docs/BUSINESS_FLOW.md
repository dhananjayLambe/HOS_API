---
owner: account-team
module: account
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---


# Business Flow — account

## Purpose

Django app `account` in DoctorProCare backend. See [ownership.md](../../shared_docs/ownership.md) for entity ownership.

## Code layout

| Area | Location |
|---|---|
| Models | `account/models/` or `models.py` (1 module(s)) |
| API | `account/api/` |
| Services | `business_id_service.py` |
| Signals | _none_ |

## Integration

See [DEPENDENCIES.md](../../shared_docs/DEPENDENCIES.md#account) and [account/AI_CONTEXT.md](../AI_CONTEXT.md).

## API base path

Check `main/urls.py` for `/api/.../` prefix mapping to `account`.
