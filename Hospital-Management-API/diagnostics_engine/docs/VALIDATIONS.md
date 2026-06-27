---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Validations — diagnostics_engine

## Pricing validations

### Hierarchy

1. **Primary:** Active `labs.BranchPackagePricing` for `(LabBranch, DiagnosticPackage version)` with `is_active`, `is_available`, valid date range.
2. **Fallback:** Sum of `labs.BranchServicePricing` per package service **only if** `DIAGNOSTICS_ALLOW_DERIVED_PACKAGE_PRICING=True`. Sets `is_price_derived=True` on order line.

| Validation | Reason |
|---|---|
| Branch package pricing must exist (or derived flag on) | Cannot quote without price |
| Package price is SKU price | Marketing price ≠ sum of tests |

| Trace | Location |
|---|---|
| Implemented In | Pricing services, settings |
| Decision | ADR-002 |
| Invariant | INV-006 |

## Fulfillment validations (STRICT)

For a branch to offer a package at quote time:

| Validation | Reason |
|---|---|
| Active `BranchPackagePricing` with `is_available=True` | Package must be sellable |
| Each package service has active `BranchServicePricing` | STRICT — no partial catalog |
| Pincode in active `BranchServiceArea` (if pincode provided) | Geographic eligibility |
| Lab branch active | Inactive lab rejected |

Temporary unavailability: set `is_available=False` on pricing rows — do not delete history.

## Order validations

| Validation | Reason | Error |
|---|---|---|
| At least one test/item | Empty booking invalid | `BOOKING_EMPTY` |
| Valid status transition | Lifecycle integrity | `INVALID_ORDER_TRANSITION` |
| Report requires confirmed line | Clinical integrity | INV-001 |

## Routing validations

| Validation | Reason |
|---|---|
| Patient location / pincode | Lab service area |
| Branch catalog completeness | STRICT fulfillment |
| Max reject snapshots | Performance / explainability cap |

See [CONFIGURATION.md](../../shared_docs/CONFIGURATION.md) for `DIAGNOSTIC_ROUTING_MAX_REJECT_SNAPSHOTS`.

## Upload validations

| Validation | Reason |
|---|---|
| Max file size | `MAX_REPORT_UPLOAD_SIZE_MB` |
| Max batch size | `MAX_REPORT_BATCH_UPLOAD_SIZE_MB` |
| Idempotency key TTL | `IDEMPOTENCY_KEY_TTL_HOURS` |
