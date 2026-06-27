---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# diagnostics_engine Documentation

Diagnostic catalog, booking, routing, and report lifecycle.

## Index

| Document | Description |
|---|---|
| [BUSINESS_FLOW.md](BUSINESS_FLOW.md) | Actors, happy path, edge cases |
| [WORKFLOWS.md](WORKFLOWS.md) | State machines, sequence diagrams |
| [MODELS.md](MODELS.md) | Data model reference |
| [API.md](API.md) | Endpoints and side effects |
| [VALIDATIONS.md](VALIDATIONS.md) | Pricing and fulfillment rules |
| [SERVICES.md](SERVICES.md) | Service layer map |
| [DECISIONS.md](DECISIONS.md) | ADR-001 through ADR-005 |
| [PERMISSIONS.md](PERMISSIONS.md) | Role matrix |
| [EVENTS.md](EVENTS.md) | Cross-app events |
| [INVARIANTS.md](INVARIANTS.md) | Module-specific invariants |
| [CHANGELOG.md](CHANGELOG.md) | History |

## Legacy files (superseded)

Content merged into structured docs above:

- `pricing_rules.md` → VALIDATIONS.md, ADR-002
- `order_lifecycle.md` → WORKFLOWS.md
- `fulfillment_rules.md` → VALIDATIONS.md, ADR-003
- `DIAGNOSTIC_REPORTING_OPERATIONAL_TRUTH_TABLE.md` → DECISIONS.md ADR-001, API.md

## Shared references

- [status_registry.md](../../shared_docs/status_registry.md)
- [patient_journey.md](../../shared_docs/architecture/patient_journey.md)
- [AI_CONTEXT.md](../AI_CONTEXT.md)
