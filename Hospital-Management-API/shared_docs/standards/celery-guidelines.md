---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Celery Guidelines

- Async WhatsApp and report delivery via Celery tasks
- `CELERY_TASK_ALWAYS_EAGER` for sync dev/test
- Document tasks in `{app}/docs/EVENTS.md`
- Retry policy documented in [CONFIGURATION.md](../CONFIGURATION.md)
