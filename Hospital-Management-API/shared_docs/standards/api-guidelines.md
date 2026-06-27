---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# API Guidelines

- URL prefix per app in `main/urls.py`
- Use DRF ViewSets for CRUD; APIView for actions
- Document purpose and side effects in `{app}/docs/API.md`, not only Swagger
- Reference [ERRORS.md](../ERRORS.md) for error codes
- Idempotency keys for upload endpoints (`IDEMPOTENCY_KEY_TTL_HOURS`)
