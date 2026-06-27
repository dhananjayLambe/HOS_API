---
owner: platform-team
module: Hospital-Management-API
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Contributing — Documentation Contract

## PR rules

Every PR that changes behavior MUST update documentation in the same PR.

| Code change | Required doc update |
|---|---|
| New/changed model | `{app}/docs/MODELS.md` + `shared_docs/ownership.md` if new entity |
| New/changed endpoint | `{app}/docs/API.md`; `PERMISSIONS.md` if role-gated |
| New status enum | `shared_docs/status_registry.md` |
| New cross-app event | `shared_docs/event_registry.md` + `{app}/docs/EVENTS.md` |
| New error code | `shared_docs/ERRORS.md` |
| New invariant | `shared_docs/INVARIANTS.md` or `{app}/docs/INVARIANTS.md` |
| New env var / feature flag | `shared_docs/CONFIGURATION.md` |
| Architectural choice | `{app}/docs/DECISIONS.md` (ADR-NNN) |
| User-visible behavior | `{app}/docs/CHANGELOG.md` |

## Metadata

All docs require YAML frontmatter. See [`shared_docs/standards/doc-metadata.md`](../shared_docs/standards/doc-metadata.md).

## Review cycle

- Set `status: approved` after team review
- Quarterly review of approved docs — update `last_updated`
- CI warns when approved docs are stale (>90 days)

## Planning documents

Feature plans go to `HOS_API/docs/` per monorepo rules. After implementation, distill into app `docs/` and link from ADR References.

## Scaffolding new apps

```bash
python3 scripts/docs/scaffold_app_docs.py new_app --tier full
```

## AI assistants

Read [`AGENTS.md`](../AGENTS.md) and target app's `AI_CONTEXT.md` before editing code.
