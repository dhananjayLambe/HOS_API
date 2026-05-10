# Provider network consolidation (DoctorPro)

## Goal

- **Canonical network:** `labs.LabOrganization`, `labs.LabBranch`, `labs.LabAddress`.
- **Branch commercial ops:** `labs.models.branch_pricing` — `BranchServiceArea`, `BranchServicePricing`, `BranchPackagePricing` (FK to `LabBranch`, FK to diagnostics catalog SKUs).
- **Diagnostics engine:** catalog, orders, reports, rules — no duplicate provider tables.

## Field / backfill rules

| Legacy (diagnostics) | Labs target | Rule |
|---------------------|-------------|------|
| `DiagnosticProvider.id` | `LabOrganization.id` | Preserve UUID on insert (`pk=`) |
| `DiagnosticProvider.code` | `organization_code`, `slug` | `slug` from `slugify(code)`; ensure uniqueness |
| `DiagnosticProvider.name` | `organization_name`, `display_name` | Same string |
| `DiagnosticProvider.license_number` | `license_number` | Direct |
| `DiagnosticProvider.is_active` | `is_active`, `is_active_for_orders`, `registration_status` | Set `APPROVED`, `is_active_for_orders=True` for migrated catalog rows |
| `DiagnosticProviderBranch.id` | `LabBranch.id` | Preserve UUID |
| `DiagnosticProviderBranch.branch_code` | `LabBranch.branch_code` | **Global:** `{provider.code}-{branch_code}` truncated to 50 chars |
| `DiagnosticProviderBranch` address | `LabAddress` | One row per branch (`OneToOne`) |
| Required lab-only fields | Synthetics | `lab_type=PATHOLOGY_LAB`, `owner_name="System"`, `primary_contact_number="0000000000"` (placeholder until edited) |

## Migrations (implemented)

1. **labs.0002** — Backfill `lab_organizations` / `lab_branches` / `lab_addresses` from legacy provider tables; create new `labs_*` pricing tables and copy rows; repoint `diagnosticorder.branch_id` FK to `lab_branches`; drop legacy provider and old pricing tables (PostgreSQL).
2. **diagnostics_engine.0006** — State-only: remove `Branch*` / `DiagnosticProvider*` from `diagnostics_engine`; alter `DiagnosticOrder.branch` → `labs.LabBranch`.

## API contract

- Request field **`branch_id`** remains; it is **`LabBranch.id`** (UUID).
- **Detail:** [DIAGNOSTICS_CATALOG_BRANCH_API.md](DIAGNOSTICS_CATALOG_BRANCH_API.md) (endpoints, OpenAPI field help, repo scan for callers).

## Rollback

- Migrations are not easily reversible once DROP TABLE runs; restore from DB backup for production. Dev: `migrate` back only if reverse migrations are added (not shipped here).
