---
owner: platform-team
module: Hospital-Management-API
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Documentation Architecture (v2)

Documentation-as-code for DoctorProCare backend.

## Read order (humans and AI)

1. [`shared_docs/glossary/healthcare_terms.md`](../shared_docs/glossary/healthcare_terms.md)
2. [`shared_docs/INVARIANTS.md`](../shared_docs/INVARIANTS.md)
3. [`{app}/AI_CONTEXT.md`](../diagnostics_engine/AI_CONTEXT.md)
4. Relevant `{app}/docs/` files

## Per-app structure

**Mandatory (every app):** `README.md`, `BUSINESS_FLOW.md`, `MODELS.md`, `API.md`, `CHANGELOG.md` + `AI_CONTEXT.md`

**Conditional:** `SERVICES.md`, `WORKFLOWS.md`, `PERMISSIONS.md`, etc. — only when the app has those concerns.

## Shared registries

| Registry | Path |
|---|---|
| Healthcare terms | `shared_docs/glossary/healthcare_terms.md` |
| Status enums | `shared_docs/status_registry.md` |
| Ownership | `shared_docs/ownership.md` |
| Dependencies | `shared_docs/DEPENDENCIES.md` |
| Events | `shared_docs/event_registry.md` |
| Configuration | `shared_docs/CONFIGURATION.md` |
| Errors | `shared_docs/ERRORS.md` |
| Invariants | `shared_docs/INVARIANTS.md` |
| Patient journey | `shared_docs/architecture/patient_journey.md` |

## Dual-track with HOS_API/docs

- **Plans** → `HOS_API/docs/backend/Hospital-Management-API/`
- **Living docs** → in-app `docs/` + `shared_docs/`
- On implementation: distill plan into app docs + ADR

## Scaffolding

```bash
python3 scripts/docs/scaffold_app_docs.py my_app --tier full
python3 scripts/docs/scaffold_app_docs.py --all-missing --tier full
```

## Standards

See [`shared_docs/standards/`](../shared_docs/standards/).
