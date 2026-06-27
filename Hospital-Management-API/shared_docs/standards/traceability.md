---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Rule Traceability Format

Every major business rule in `BUSINESS_FLOW.md`, `VALIDATIONS.md`, or `INVARIANTS.md` should include:

```markdown
### Rule: Short rule description

| Trace | Location |
|---|---|
| Implemented In | `app/services/module.py` |
| Tests | `app/tests/test_module.py` |
| API | `POST /api/v1/.../` |
| Decision | ADR-NNN |
| Invariant | INV-NNN |
```

Not every field is required for small rules, but **Implemented In** and at least one of Tests/API should always be present for rules that affect user-visible behavior.
