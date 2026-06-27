---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Documentation Metadata Standard

Every `.md` file in DoctorProCare backend documentation MUST begin with this YAML frontmatter block:

```yaml
---
owner: team-or-person-responsible
module: django_app_name_or_shared_docs
version: 1.0
last_updated: YYYY-MM-DD
reviewed_by: name-or-dash
status: draft          # draft | approved | deprecated
---
```

## Status values

| Status | Meaning |
|---|---|
| `draft` | Work in progress; may be incomplete or unreviewed |
| `approved` | Reviewed and trustworthy for development decisions |
| `deprecated` | Kept for history; must link to replacement document |

## Review cycle

- `approved` documents should be reviewed quarterly
- Update `last_updated` on every substantive change
- CI warns when `approved` docs have `last_updated` older than 90 days

## Deprecated documents

When deprecating, add to frontmatter body:

```markdown
> **Deprecated:** Replaced by [new_doc.md](../path/to/new_doc.md). Do not use for new development.
```
