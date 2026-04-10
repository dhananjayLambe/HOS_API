# Diagnostic pricing rules

## Hierarchy

1. **Primary:** For a given `DiagnosticProviderBranch` and **versioned** `DiagnosticPackage`, use the active `BranchPackagePricing` row (`is_active`, `is_available`, `valid_from` / `valid_to`).
2. **Fallback:** Sum of active `BranchServicePricing` for each service in the package **only if** `DIAGNOSTICS_ALLOW_DERIVED_PACKAGE_PRICING` is `True` in Django settings. Persist `is_price_derived=True` on the order line when this path is used.

## Marketing vs sum

Package selling price is a **SKU price** and does not have to equal the sum of individual test list prices.

## Commission

`BranchPackagePricing` stores margin fields aligned with `BranchServicePricing`, plus `commission_source` (`default` / `campaign` / `custom`) for future campaigns. Snapshots on `DiagnosticOrderItem` preserve amounts at booking time.
