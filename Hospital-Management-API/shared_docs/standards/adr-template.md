---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Architecture Decision Record (ADR) Template

Use in `{app}/docs/DECISIONS.md`. Each decision gets a stable ID `ADR-NNN`.

## Template

```markdown
## ADR-NNN: Short title

| Field | Value |
|---|---|
| Status | Proposed / Accepted / Deprecated / Superseded |
| Date | YYYY-MM-DD |
| Context | What problem or constraint drove this decision? |
| Decision | What was decided? |
| Alternatives | What was considered and rejected? |
| Consequences | Positive and negative outcomes |
| Migration Plan | How to migrate existing data or callers |
| References | Links to plans, PRs, external docs |
```

## Status lifecycle

- **Proposed** — under discussion
- **Accepted** — current truth
- **Deprecated** — no longer recommended; link to superseding ADR
- **Superseded by ADR-XXX** — replaced by a newer decision

## Example

See [diagnostics_engine/docs/DECISIONS.md](../../diagnostics_engine/docs/DECISIONS.md) for ADR-001 (report entity model).
