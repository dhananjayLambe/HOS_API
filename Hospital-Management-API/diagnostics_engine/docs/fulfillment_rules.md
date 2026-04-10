# Diagnostic fulfillment rules (STRICT)

## Predicate

For a branch to offer a **package version** at quote time:

- Active `BranchPackagePricing` exists for `(branch, package)` with `is_available=True`.
- For **each** `DiagnosticPackageItem` service, an active `BranchServicePricing` row exists with `is_available=True` (STRICT: no silent partial catalog).
- Optional **pincode**: if provided, the branch must have an active `BranchServiceArea` row for that pincode.

## Temporary unavailability

Use `is_available=False` on pricing rows to block a SKU without deleting history.

## Multi-provider split

`fulfillment_mode=partial` is reserved; v1 only enforces STRICT end-to-end at one branch.
