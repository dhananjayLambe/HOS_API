---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Redis Usage

## Roles

| Role | Purpose |
|---|---|
| Celery broker | Async tasks (WhatsApp, report delivery) |
| Channels layer | WebSocket queue updates |
| Cache | Consultation summary, suggestion cache |

## Conventions

- Set TTL on cache keys (`INV_SUGGEST_CACHE_TTL_SECONDS`, `CONSULTATION_SUMMARY_CACHE_TTL_SECONDS`)
- Use consistent key naming: `{app}:{entity}:{id}`

## Config

`REDIS_URL` in environment. See Celery/Channels settings in `main/settings.py`.
