---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# AI-Friendly Documentation Formatting

Rules for all DoctorProCare backend documentation.

## Structure

- Use consistent heading hierarchy (`#` title, `##` sections, `###` subsections — never skip levels)
- Keep paragraphs short (3–5 sentences maximum)
- Prefer tables over long prose for permissions, statuses, ownership, errors

## Diagrams

- Use Mermaid for workflows, state machines, and sequence diagrams
- State machines must document invalid transitions in a separate table or note

## Cross-linking

- Link to [shared_docs/status_registry.md](../status_registry.md) instead of duplicating status enums
- Link to [shared_docs/glossary/healthcare_terms.md](../glossary/healthcare_terms.md) for term definitions
- Link to [shared_docs/INVARIANTS.md](../INVARIANTS.md) for system-wide rules

## Stable IDs

| Type | Format | Example |
|---|---|---|
| Architecture decision | `ADR-NNN` | ADR-001 |
| Invariant | `INV-NNN` | INV-001 |
| Error code | `ERR-NNN` or `SCREAMING_SNAKE` | LAB_NOT_AVAILABLE |
| Event | `EVT-NNN` or `SCREAMING_SNAKE` | CONSULTATION_COMPLETED |

## Code references

- Use file paths: `diagnostics_engine/services/routing/`
- Avoid line numbers (they drift)

## Traceability

Major business rules must include a traceability table. See [traceability.md](traceability.md).
