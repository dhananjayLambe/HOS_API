---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Diagnostics Cross-App Overview

Diagnostics spans three apps:

| Layer | App | Responsibility |
|---|---|---|
| Clinical intent | consultations_core | Investigation ordered |
| Commerce + routing | diagnostics_engine | Catalog, order, routing, reports |
| Fulfillment | labs | Assignment, collection, execution |

## Key terms

See [glossary/healthcare_terms.md](../glossary/healthcare_terms.md) — Booking, Order, Report, Lab Assignment.

## Lifecycles

See [status_registry.md](../status_registry.md) and [patient_journey.md](patient_journey.md).

## Tier-1 docs

- [diagnostics_engine/docs/](../../diagnostics_engine/docs/)
- [labs/docs/](../../labs/docs/)
