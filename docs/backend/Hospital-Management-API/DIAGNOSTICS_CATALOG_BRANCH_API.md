# Diagnostics catalog API — `branch_id` contract (DoctorPro)

After provider-network consolidation, **`branch_id` in diagnostics catalog APIs is always a `labs.LabBranch` primary key (UUID)**. It is the same entity type as `branch_id` returned by **labs onboarding** (`LabBranch.id`).

Legacy **`DiagnosticProviderBranch`** IDs are no longer valid for these endpoints.

## Base path

All routes below are under the Django URL prefix **`/api/diagnostics/`** (see [`main/urls.py`](../../../Hospital-Management-API/main/urls.py)).

## Endpoints

### POST `catalog/quote/package/`

- **Name:** `diagnostic-package-quote`
- **Body:** `branch_id` (UUID), `package_id` (UUID)
- **`branch_id`:** Must exist in **`labs_labbranch`** (`labs.LabBranch`). Resolved in [`PackageQuoteView`](../../../Hospital-Management-API/diagnostics_engine/api/views/catalog.py) via `get_object_or_404(LabBranch, pk=branch_id)`.
- **Pricing:** Uses [`PricingQuoteService`](../../../Hospital-Management-API/diagnostics_engine/domain/pricing.py) against **`labs.BranchPackagePricing`** / **`labs.BranchServicePricing`**.

### GET `catalog/packages/<package_id>/providers/`

- **Name:** `diagnostic-package-providers`
- **Query:** optional `pincode` (used for STRICT fulfillment / service area checks).
- **Response:** `{ "branch_ids": ["<uuid>", ...], "count": <n> }` — each string is a **`LabBranch.id`** that can fulfill the package at the given pincode (when provided).

### Related: labs onboarding

- Responses that include **`branch_id`** from [`lab_onboarding_service`](../../../Hospital-Management-API/labs/api/services/lab_onboarding_service.py) are **`LabBranch`** UUIDs — safe to pass into diagnostics quote/providers APIs.

## OpenAPI / schema

Field descriptions for request serializers live in [`diagnostics_engine/api/serializers/catalog.py`](../../../Hospital-Management-API/diagnostics_engine/api/serializers/catalog.py) (`help_text` on `branch_id` and related fields) so **drf-yasg** / Swagger can surface the contract.

## Repository scan (external clients)

**Scope:** Workspace root **`HOS_API`** (includes `Hospital-Management-API` and embedded `Hospital-Web-UI`).

| Pattern | Result |
|---------|--------|
| `catalog/quote`, `diagnostic-package-quote`, `catalog/packages/.../providers/` | Only defined in backend [`diagnostics_engine/api/urls.py`](../../../Hospital-Management-API/diagnostics_engine/api/urls.py); **no** TS/TSX/JS callers in `Hospital-Web-UI` for these paths. |
| Diagnostics UI usage | Web UI uses **`/diagnostics/search/`** and **`/diagnostics/investigations/suggestions/`** only (investigations flow). |

**Outside this workspace:** mobile apps, separate BFFs, or other git repos were **not** scanned. If any client cached pre-migration **`DiagnosticProviderBranch`** UUIDs as `branch_id`, update them to **`LabBranch`** IDs (migration may have preserved branch UUIDs when backfilling from legacy rows — verify per environment).
