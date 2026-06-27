---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Business Flow — diagnostics_engine

## Why this module exists

Turns clinical investigation intent into executable, priced, routed lab orders with report delivery. Separates **clinical** (consultations_core) from **commercial/operational** (this app).

## Actors

| Actor | Actions |
|---|---|
| Patient | Browse catalog, confirm booking, view reports |
| Doctor | Order investigations; triggers order creation from consultation |
| Admin | Catalog import, onboarding validation |
| Lab (via labs app) | Fulfillment — assignment, collection, upload |
| System | Routing pipeline, status aggregation, notifications |

## Entry points

- Consultation investigation ordered → `POST /api/diagnostics/orders/create-from-consultation/`
- Catalog search / quote → catalog and quote APIs
- Package suggestions → `ENABLE_SUGGESTIONS` feature flags

## Exit points

- Order `completed` or `cancelled`
- Report `delivered` to patient
- Routing `no_match_found` with reject snapshots for support

## Happy path

```
Investigation ordered (consultations_core)
  → DiagnosticOrder created (status: created)
  → Patient/staff confirms (status: confirmed, test lines expanded)
  → Routing assigns lab branch
  → Lab accepts (labs)
  → Sample collected → in_processing → report_ready → completed
  → Report uploaded → delivered → patient notified
```

See [shared_docs/architecture/patient_journey.md](../../shared_docs/architecture/patient_journey.md).

## Edge cases

- **Partial completion:** Some test lines complete, others cancelled → order `partial`
- **Derived package pricing:** Only when `DIAGNOSTICS_ALLOW_DERIVED_PACKAGE_PRICING=True`
- **No eligible lab:** Routing persists reject snapshots (up to `DIAGNOSTIC_ROUTING_MAX_REJECT_SNAPSHOTS`)
- **Package composition:** Frozen at confirm via `composition_snapshot`

## Rejection cases

| Case | Result |
|---|---|
| Empty order | `BOOKING_EMPTY` — see [ERRORS.md](../../shared_docs/ERRORS.md) |
| Lab unavailable for pincode | `LAB_NOT_AVAILABLE` |
| Invalid status transition | `INVALID_ORDER_TRANSITION` |
| STRICT fulfillment: missing branch service pricing | Quote/confirm blocked |

## Business rules

### Rule: Package price is a SKU price

| Trace | Location |
|---|---|
| Implemented In | `labs.BranchPackagePricing`, order item snapshots |
| API | Order confirm flow |
| Decision | ADR-002 |
| Invariant | INV-006 |

### Rule: Test lines created at confirm, not cart

| Trace | Location |
|---|---|
| Implemented In | `DiagnosticOrder.update_status()` |
| Tests | Order lifecycle tests |
| Reference | Migrated from `order_lifecycle.md` |

## Related legacy docs

Superseded content merged here from:

- `docs/pricing_rules.md` → [VALIDATIONS.md](VALIDATIONS.md)
- `docs/order_lifecycle.md` → [WORKFLOWS.md](WORKFLOWS.md)
- `docs/fulfillment_rules.md` → [VALIDATIONS.md](VALIDATIONS.md)
