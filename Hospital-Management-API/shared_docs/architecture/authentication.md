---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Authentication

JWT via `rest_framework_simplejwt`. Custom user: `account.User`.

## Endpoints

- `/api/auth/` — login, refresh, register

## Roles

Documented per-app in `{app}/docs/PERMISSIONS.md`.

## Rules

- All clinical APIs require authenticated user unless explicitly public
- Token blacklist enabled for logout/revocation
