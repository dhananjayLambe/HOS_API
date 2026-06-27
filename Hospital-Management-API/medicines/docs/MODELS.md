---
owner: medicines-team
module: medicines
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Models — medicines

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `DrugMaster`

- **Source:** `medicines/models/drug.py`
- **Fields:** `id`, `code`, `brand_name`, `drug_type`, `generic_name`, `composition`, `strength`, `formulation`, `manufacturer`, `schedule_type`, `is_otc`, `is_common`, `is_active`, `search_vector`, `created_at`, `updated_at`

### `DrugComposition`

- **Source:** `medicines/models/drug.py`
- **Fields:** `id`, `drug`, `ingredient`, `strength_value`, `strength_unit`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `FormulationMaster`

- **Source:** `medicines/models/masters.py`
- **Fields:** `id`, `name`, `is_active`, `created_at`, `updated_at`

### `DoseUnitMaster`

- **Source:** `medicines/models/masters.py`
- **Fields:** `id`, `name`, `is_active`, `created_at`, `updated_at`

### `RouteMaster`

- **Source:** `medicines/models/masters.py`
- **Fields:** `id`, `code`, `name`, `description`, `is_active`, `search_vector`, `created_at`, `updated_at`

### `FrequencyMaster`

- **Source:** `medicines/models/masters.py`
- **Fields:** `id`, `code`, `display_name`, `description`, `times_per_day`, `interval_hours`, `is_prn`, `is_stat`, `is_active`, `search_vector`, `created_at`, `updated_at`

<!-- auto-generated:end -->
