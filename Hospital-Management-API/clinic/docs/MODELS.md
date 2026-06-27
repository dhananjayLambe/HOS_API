---
owner: clinic-team
module: clinic
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Models — clinic

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `Clinic`

- **Source:** `clinic/models.py`
- **Fields:** `id`, `code`, `name`, `contact_number_primary`, `contact_number_secondary`, `website_url`, `email_address`, `registration_number`, `gst_number`, `emergency_contact_name`, `emergency_contact_number`, `emergency_email_address`, `emergency_instructions_text`, `status`, `rejection_reason`, `is_featured`, `is_approved`, `kyc_completed`, `kyc_verified`, `created_at`, `updated_at`

### `ClinicProfile`

- **Source:** `clinic/models.py`
- **Fields:** `clinic`, `logo`, `cover_photo`, `about`, `established_year`, `kyc_verified`, `profile_completion`, `status`, `created_at`, `updated_at`

### `ClinicAddress`

- **Source:** `clinic/models.py`
- **Fields:** `id`, `clinic`, `address`, `address2`, `city`, `state`, `pincode`, `country`, `latitude`, `longitude`, `google_place_id`, `google_maps_url`, `created_at`, `updated_at`

### `ClinicSpecialization`

- **Source:** `clinic/models.py`
- **Fields:** `id`, `clinic`, `specialization_name`, `description`, `created_at`, `updated_at`

### `ClinicSchedule`

- **Source:** `clinic/models.py`
- **Fields:** `id`, `clinic`, `day_of_week`, `is_closed`, `open_time`, `close_time`, `is_active`, `created_at`, `updated_at`

### `ClinicHoliday`

- **Source:** `clinic/models.py`
- **Fields:** `id`, `clinic`, `is_full_day`, `start_date`, `end_date`, `start_time`, `end_time`, `title`, `description`, `is_active`, `is_approved`, `created_by`, `created_at`, `updated_at`

### `ClinicService`

- **Source:** `clinic/models.py`
- **Fields:** `id`, `clinic`, `checkup_available`, `consultation_available`, `daycare_available`, `followup_available`, `consultation_fees`, `followup_fees`, `daycare_fees`, `case_paper_validity`, `case_paper_fees`, `created_at`, `updated_at`

### `ClinicServiceList`

- **Source:** `clinic/models.py`
- **Fields:** `id`, `clinic`, `service_name`, `service_description`, `service_fee`, `duration`, `created_at`, `updated_at`

### `ClinicAdminProfile`

- **Source:** `clinic/models.py`
- **Fields:** `id`, `user`, `clinic`, `kya_completed`, `kya_verified`, `approval_date`, `created_at`, `updated_at`

<!-- auto-generated:end -->
