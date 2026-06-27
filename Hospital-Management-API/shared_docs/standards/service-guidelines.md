---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Service Guidelines

- Business logic in `services/`, not views
- State transitions via dedicated state machines (see `EncounterStateMachine`, `visit_workflow.py`)
- Document in `{app}/docs/SERVICES.md` with dependencies and transaction boundaries
- Use `@transaction.atomic` for multi-model updates
