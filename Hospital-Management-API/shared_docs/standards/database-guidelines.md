---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Database Guidelines

- PostgreSQL in production
- Migrations per app; never edit applied migrations
- Clinical entities: prefer PROTECT on delete
- Audit tables append-only where applicable
