---
owner: analytics-team
module: analytics
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Models — analytics

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `DoctorMedicineUsage`

- **Source:** `analytics/models.py`
- **Fields:** `id`, `doctor`, `drug`, `usage_count`, `last_used_at`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `DiagnosisMedicineMap`

- **Source:** `analytics/models.py`
- **Fields:** `id`, `diagnosis`, `drug`, `weight`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `PatientMedicineUsage`

- **Source:** `analytics/models.py`
- **Fields:** `id`, `patient_id`, `drug`, `usage_count`, `last_used_at`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

<!-- auto-generated:end -->
