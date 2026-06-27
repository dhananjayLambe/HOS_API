---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Model Guidelines

- Extend `core.BaseModel` where applicable for UUID/timestamps
- Document every model in `{app}/docs/MODELS.md`
- Register new status enums in [status_registry.md](../status_registry.md)
- Use `PROTECT` for clinical FKs; `SET_NULL` only when explicitly safe
- Ownership: see [ownership.md](../ownership.md)
