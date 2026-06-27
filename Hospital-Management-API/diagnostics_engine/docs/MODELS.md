---
owner: diagnostics_engine-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Models — diagnostics_engine

Owner app for commercial diagnostic entities. See [ownership.md](../../shared_docs/ownership.md).

## DiagnosticOrder

| Field | Description |
|---|---|
| Purpose | Commercial lab order (booking entity) |
| Key FKs | `encounter`, `patient_profile`, `doctor`, `branch` (LabBranch) |
| Status | [OrderStatus](../../shared_docs/status_registry.md#order-status-diagnosticorder) |
| Business rules | Status via `update_status()` only; lines expanded at confirm |

## DiagnosticOrderItem

| Field | Description |
|---|---|
| Purpose | Priced line (test or package) with commission snapshot |
| Business rules | Snapshots pricing at booking; `is_price_derived` flag |

## DiagnosticOrderTestLine

| Field | Description |
|---|---|
| Purpose | Execution unit per test |
| Status | [OrderTestLineStatus](../../shared_docs/status_registry.md#order-test-line-status) |
| Created | On order confirm |

## DiagnosticServiceMaster / DiagnosticPackage

| Field | Description |
|---|---|
| Purpose | Catalog master data |
| Relationships | Categories, package items, branch pricing via labs |
| Business rules | Cannot delete if mapped to active orders |

## DiagnosticTestReport / DiagnosticReportArtifact

| Field | Description |
|---|---|
| Purpose | Report lifecycle + file storage |
| Status | [ReportLifecycleStatus](../../shared_docs/status_registry.md#report-lifecycle-status) |
| Business rules | Immutable after delivered (INV-005) |

## Routing models

`DiagnosticRoutingRun`, assignment snapshots — see `models/routing.py`. Routing status on order: [DiagnosticOrderRoutingStatus](../../shared_docs/status_registry.md#diagnostic-order-routing-status).

## Catalog models

`DiagnosticCategory`, clinical rules, package items — see `models/catalog.py`.

<!-- auto-generated sections may be appended by scripts/docs/generate_models_md.py -->

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `DiagnosticCategory`

- **Source:** `diagnostics_engine/models/catalog.py`
- **Fields:** `id`, `name`, `code`, `parent`, `ordering`, `created_by`, `updated_by`, `created_at`, `updated_at`, `is_active`, `deleted_at`, `deleted_by`

### `DiagnosticServiceMaster`

- **Source:** `diagnostics_engine/models/catalog.py`
- **Fields:** `id`, `code`, `name`, `category`, `sample_type`, `home_collection_possible`, `appointment_required`, `tat_hours_default`, `preparation_notes`, `short_name`, `synonyms`, `tags`, `search_text`, `synopsis`, `popularity_score`, `doctor_usage_score`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`

### `DiagnosticPackage`

- **Source:** `diagnostics_engine/models/catalog.py`
- **Fields:** `id`, `lineage_code`, `version`, `is_latest`, `parent_package`, `category`, `name`, `description`, `is_active`, `is_featured`, `is_promoted`, `priority_score`, `package_type`, `collection_type`, `min_tat_hours`, `max_tat_hours`, `fasting_required`, `gender_applicability`, `age_min`, `age_max`, `tags`, `conditions_supported`, `package_popularity_score`, `search_text`, `created_by` (+5 more)

### `DiagnosticPackageItem`

- **Source:** `diagnostics_engine/models/catalog.py`
- **Fields:** `id`, `package`, `service`, `quantity`, `is_mandatory`, `display_order`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by`

### `DiagnosisTestMapping`

- **Source:** `diagnostics_engine/models/catalog.py`
- **Fields:** `id`, `diagnosis`, `service`, `rule_type`, `weight`, `reason_template`, `ordering`, `is_active`, `created_at`, `updated_at`, `created_by`, `updated_by`

### `SymptomTestMapping`

- **Source:** `diagnostics_engine/models/catalog.py`
- **Fields:** `id`, `symptom`, `service`, `rule_type`, `weight`, `reason_template`, `ordering`, `is_active`, `created_at`, `updated_at`, `created_by`, `updated_by`

### `DiagnosticOrder`

- **Source:** `diagnostics_engine/models/orders.py`
- **Fields:** `id`, `order_number`, `encounter`, `consultation`, `patient_profile`, `doctor`, `branch`, `status`, `source`, `total_amount_snapshot`, `discount_amount`, `final_amount`, `accepted_by_lab`, `accepted_at`, `sample_collection_mode`, `routing_status`, `scheduled_at`, `collected_at`, `processing_started_at`, `report_ready_at`, `completed_at`, `cancelled_at`, `cancelled_reason`, `cancelled_by`, `is_active` (+4 more)

### `DiagnosticOrderItem`

- **Source:** `diagnostics_engine/models/orders.py`
- **Fields:** `id`, `order`, `line_type`, `status`, `service`, `diagnostic_package`, `package_version_snapshot`, `composition_snapshot`, `is_price_derived`, `is_home_collection_eligible`, `requires_fasting`, `requires_appointment`, `metadata_snapshot`, `display_order`, `name_snapshot`, `price_snapshot`, `platform_earning_snapshot`, `doctor_earning_snapshot`, `lab_payout_snapshot`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by` (+8 more)

### `DiagnosticOrderTestLine`

- **Source:** `diagnostics_engine/models/orders.py`
- **Fields:** `id`, `order`, `order_item`, `service`, `status`, `execution_type`, `instructions`, `created_at`, `updated_at`, `created_by`, `updated_by`

### `DiagnosticReport`

- **Source:** `diagnostics_engine/models/reports.py`
- **Fields:** `id`, `order`, `storage_mode`, `structured_result`, `file`, `status`, `uploaded_by`, `is_editable`, `uploaded_at`, `delivered_at`, `delivered_by`, `delivered_reason`, `updated_at`, `deleted_at`, `deleted_by`

### `DiagnosticTestReport`

- **Source:** `diagnostics_engine/models/reports.py`
- **Fields:** `id`, `order_test_line`, `storage_mode`, `structured_result`, `report_number`, `revision_number`, `status`, `delivery_status`, `ready_at`, `is_editable`, `uploaded_at`, `delivered_at`, `uploaded_by`, `delivered_by`, `reviewed_by`, `reviewed_at`, `last_reupload_reason`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`, `supersedes`, `source_system`

### `DiagnosticReportArtifact`

- **Source:** `diagnostics_engine/models/reports.py`
- **Fields:** `id`, `report`, `report_public_id`, `artifact_public_id`, `patient_account_uuid`, `patient_profile_uuid`, `encounter_uuid`, `stored_filename`, `original_filename`, `download_filename`, `file_extension`, `file`, `artifact_type`, `is_primary`, `uploaded_by`, `uploaded_at`, `file_size`, `content_type`, `checksum`, `checksum_sha256`, `storage_path`, `storage_key`, `version`, `artifact_version`, `artifact_state` (+11 more)

### `RoutingRun`

- **Source:** `diagnostics_engine/models/routing.py`
- **Fields:** `diagnostic_order`, `encounter`, `consultation`, `patient`, `clinic`, `doctor`, `encounter_display_id`, `patient_name_snapshot`, `patient_phone_snapshot`, `clinic_name_snapshot`, `doctor_name_snapshot`, `routing_status`, `routing_strategy`, `routing_trigger_source`, `routing_engine_version`, `resolved_location_source`, `resolved_pincode`, `resolved_latitude`, `resolved_longitude`, `requested_collection_mode`, `started_at`, `completed_at`, `failed_at`, `retry_count`, `last_retry_at` (+3 more)

### `EligibleLabSnapshot`

- **Source:** `diagnostics_engine/models/routing.py`
- **Fields:** `routing_run`, `diagnostic_order`, `encounter`, `consultation`, `patient`, `lab`, `branch`, `is_eligible`, `supports_home_collection`, `supports_all_tests`, `distance_km`, `estimated_tat_hours`, `estimated_price`, `eligibility_score`, `ranking_position`, `distance_source`, `missing_tests_snapshot`, `metadata`

### `RoutingDecisionSnapshot`

- **Source:** `diagnostics_engine/models/routing.py`
- **Fields:** `routing_run`, `eligible_lab_snapshot`, `encounter`, `consultation`, `decision_type`, `recommendation_label`, `recommendation_labels`, `recommendation_confidence`, `distance_score`, `price_score`, `tat_score`, `quality_score`, `partner_score`, `final_score`, `decision_reason`, `metadata`

### `RoutingLabOrderAssignment`

- **Source:** `diagnostics_engine/models/routing.py`
- **Fields:** `diagnostic_order`, `encounter`, `consultation`, `patient`, `clinic`, `doctor`, `encounter_display_id`, `patient_name_snapshot`, `patient_phone_snapshot`, `clinic_name_snapshot`, `doctor_name_snapshot`, `routing_run`, `selected_snapshot`, `selected_decision`, `lab`, `branch`, `assignment_status`, `assignment_type`, `assignment_reason`, `assigned_at`, `viewed_at`, `accepted_at`, `rejected_at`, `expired_at`, `expires_at` (+9 more)

### `RoutingEvent`

- **Source:** `diagnostics_engine/models/routing.py`
- **Fields:** `routing_run`, `assignment`, `diagnostic_order`, `encounter`, `consultation`, `event_type`, `actor`, `source`, `metadata`

<!-- auto-generated:end -->
