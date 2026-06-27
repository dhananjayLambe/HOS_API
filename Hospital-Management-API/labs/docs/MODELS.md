---
owner: labs-team
module: labs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Models — labs

Owner: [ownership.md](../../shared_docs/ownership.md)

## Lab / LabBranch

Network and branch entities. Branch holds pricing, service areas, pincode coverage.

## LabOrderAssignment

| Field | Description |
|---|---|
| Purpose | Operational ownership of order at a branch |
| Status | [LabAssignmentStatus](../../shared_docs/status_registry.md#lab-assignment-status) |
| API identity | `task_id` in report queue UI |

## LabCollectionRequest

Home collection logistics. Status via `collection_workflow.py`.

## LabVisitAppointment

Branch visit logistics. Status via `visit_workflow.py`.

## LabOrderTestExecution

Per-test execution lifecycle. Status: [TestExecutionStatus](../../shared_docs/status_registry.md#test-execution-status).

## Pricing

`BranchServicePricing`, `BranchPackagePricing` — consumed by diagnostics_engine for quotes (ADR-002).

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `BranchServiceArea`

- **Source:** `labs/models/branch_pricing.py`
- **Fields:** `id`, `branch`, `pincode`, `city`, `state`, `is_home_collection_available`, `is_active`, `metadata`

### `BranchServicePricing`

- **Source:** `labs/models/branch_pricing.py`
- **Fields:** `id`, `branch`, `service`, `selling_price`, `cost_price`, `platform_margin_snapshot`, `doctor_margin_snapshot`, `lab_payout_snapshot`, `platform_margin_type`, `platform_margin_value`, `doctor_commission_type`, `doctor_commission_value`, `valid_from`, `valid_to`, `is_active`, `is_available`, `currency`, `home_collection_supported`, `report_delivery_hours`, `metadata`

### `BranchPackagePricing`

- **Source:** `labs/models/branch_pricing.py`
- **Fields:** `id`, `branch`, `package`, `mrp`, `selling_price`, `platform_margin_type`, `platform_margin_value`, `doctor_commission_type`, `doctor_commission_value`, `lab_payout_snapshot`, `commission_source`, `settlement_cycle`, `fulfillment_mode`, `valid_from`, `valid_to`, `is_active`, `is_available`, `created_by`, `updated_by`, `currency`, `home_collection_supported`, `report_delivery_hours`, `metadata`

### `LabOrganization`

- **Source:** `labs/models/lab_auth.py`
- **Fields:** `organization_name`, `display_name`, `organization_code`, `slug`, `lab_type`, `registration_number`, `license_number`, `pan_number`, `gst_number`, `owner_name`, `owner_designation`, `primary_contact_number`, `alternate_contact_number`, `support_email`, `website`, `logo`, `home_collection_available`, `walk_in_collection_available`, `accepts_online_orders`, `registration_status`, `is_verified`, `onboarding_completed`, `is_active_for_orders`, `approved_by`, `approved_at` (+2 more)

### `LabBranch`

- **Source:** `labs/models/lab_auth.py`
- **Fields:** `organization`, `branch_name`, `branch_code`, `opening_time`, `closing_time`, `home_collection_available`, `walk_in_collection_available`, `emergency_collection_available`, `accepts_online_orders`, `report_delivery_hours`, `home_collection_radius_km`, `is_active_for_orders`, `is_primary_branch`, `metadata`

### `LabAddress`

- **Source:** `labs/models/lab_auth.py`
- **Fields:** `branch`, `address_line_1`, `address_line_2`, `landmark`, `city`, `state`, `country`, `pincode`, `latitude`, `longitude`

### `LabSchedule`

- **Source:** `labs/models/lab_auth.py`
- **Fields:** `branch`, `day_of_week`, `is_closed`, `open_time`, `close_time`, `home_collection_available`, `emergency_collection_available`

### `LabUser`

- **Source:** `labs/models/lab_auth.py`
- **Fields:** `user`, `organization`, `branch`, `role`, `employee_code`, `is_primary_admin`

### `LabDocument`

- **Source:** `labs/models/lab_auth.py`
- **Fields:** `organization`, `document_type`, `document_number`, `file`, `expiry_date`, `is_verified`, `verification_notes`, `verified_by`, `verified_at`

### `LabReportReview`

- **Source:** `labs/models/lab_reports.py`
- **Fields:** `diagnostic_test_report`, `reviewed_by`, `review_status`, `review_notes`, `reviewed_at`, `approved_at`, `rejected_at`, `rejection_reason`, `internal_notes`, `metadata`

### `LabSampleTracking`

- **Source:** `labs/models/lab_tracking.py`
- **Fields:** `test_line`, `sample_barcode`, `sample_type`, `sample_status`, `collected_at`, `received_at_lab`, `processing_started_at`, `processing_completed_at`, `collected_by`, `received_by`, `rejected_reason`, `internal_notes`, `metadata`

### `LabReportDeliveryLog`

- **Source:** `labs/models/lab_tracking.py`
- **Fields:** `diagnostic_test_report`, `delivery_channel`, `recipient`, `delivery_status`, `sent_at`, `delivered_at`, `viewed_at`, `failure_reason`, `external_message_id`, `retry_count`, `last_retry_at`, `metadata`

### `LabOrderAssignment`

- **Source:** `labs/models/lab_workflow.py`
- **Fields:** `diagnostic_order`, `lab_branch`, `assigned_by`, `status`, `assigned_at`, `accepted_at`, `rejected_at`, `rejection_reason`, `internal_notes`, `metadata`

### `LabCollectionRequest`

- **Source:** `labs/models/lab_workflow.py`
- **Fields:** `diagnostic_order`, `lab_branch`, `assigned_phlebotomist`, `preferred_date`, `preferred_slot`, `confirmed_date`, `confirmed_slot`, `collection_status`, `collection_type`, `retry_count`, `assigned_at`, `assigned_by`, `assignment_note`, `in_progress_at`, `failed_at`, `address_snapshot`, `patient_notes`, `internal_notes`, `collected_at`, `cancelled_at`, `cancellation_reason`, `metadata`

### `LabVisitAppointment`

- **Source:** `labs/models/lab_workflow.py`
- **Fields:** `diagnostic_order`, `lab_branch`, `appointment_date`, `appointment_slot`, `status`, `instructions`, `patient_notes`, `internal_notes`, `confirmed_at`, `checked_in_at`, `completed_at`, `no_show_at`, `status_changed_at`, `cancelled_at`, `cancellation_reason`, `metadata`

### `LabOrderTestExecution`

- **Source:** `labs/models/lab_workflow.py`
- **Fields:** `assignment`, `test_line`, `lab_branch`, `collection_request`, `visit_appointment`, `execution_status`, `execution_type`, `assigned_phlebotomist`, `accepted_by`, `last_updated_by`, `scheduled_at`, `accepted_at`, `started_at`, `failed_at`, `sample_collected_at`, `processing_started_at`, `report_ready_at`, `completed_at`, `cancelled_at`, `rejection_reason`, `cancellation_reason`, `internal_notes`, `metadata`

<!-- auto-generated:end -->
