---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Models — doctor

Owner: [ownership.md](../../shared_docs/ownership.md)

## doctor

Core profile: name, registration, clinic links, photo, signature, bank details.

## KYC / credentials

GovernmentID, Education, Registration (medical license), Certifications, Awards.

## Scheduling

DoctorWorkingHours, DoctorSchedulingRules, DoctorLeave, DoctorAvailability, OPD status models.

## Fees

DoctorFeeStructure, FollowUpPolicy, CancellationPolicy.

## Relationships

- FK to `account.User`
- Used by appointments, consultations_core, clinic, queue_management

## Business constraints

- Doctor ID generation via management commands
- KYC status tracked for onboarding phases

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `doctor`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `public_id`, `user`, `secondary_mobile_number`, `dob`, `about`, `photo`, `years_of_experience`, `avg_rating`, `slug`, `gender`, `digital_signature_consent`, `terms_and_conditions_acceptance`, `consent_for_data_storage`, `title`, `primary_specialization`, `consultation_modes`, `languages_spoken`, `status`, `rejection_reason`, `is_featured`, `is_approved`, `kyc_completed`, `kyc_verified`, `profile_completion` (+5 more)

### `DoctorAddress`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `address`, `address2`, `city`, `state`, `pincode`, `country`, `latitude`, `longitude`, `google_place_id`, `google_maps_url`, `created_at`, `updated_at`

### `Registration`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `medical_registration_number`, `medical_council`, `registration_certificate`, `registration_date`, `valid_upto`, `is_verified`, `verification_notes`, `created_at`, `updated_at`

### `GovernmentID`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `pan_card_number`, `pan_card_file`, `aadhar_card_number`, `aadhar_card_file`, `is_verified`, `created_at`, `updated_at`

### `Education`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `qualification`, `institute`, `year_of_completion`, `certificate`, `is_verified`, `created_at`, `updated_at`

### `CustomSpecialization`

- **Source:** `doctor/models.py`
- **Fields:** `name`, `description`, `created_at`, `updated_at`

### `Specialization`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `specialization`, `custom_specialization`, `is_primary`, `created_at`, `updated_at`

### `DoctorService`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `name`, `description`, `fee`, `created_at`, `updated_at`

### `Award`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `name`, `description`, `awarded_by`, `date_awarded`, `created_at`, `updated_at`

### `Certification`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `title`, `issued_by`, `date_of_issue`, `expiry_date`, `created_at`, `updated_at`

### `DoctorFeedback`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `rating`, `comments`, `reviewed_by`, `created_at`, `updated_at`

### `DoctorSocialLink`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `platform`, `url`, `created_at`, `updated_at`

### `KYCStatus`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `registration_status`, `registration_reason`, `education_status`, `education_reason`, `photo_status`, `photo_reason`, `aadhar_status`, `aadhar_reason`, `pan_status`, `pan_reason`, `digital_signature`, `kya_verified`, `reviewed_by`, `verified_at`, `updated_at`

### `DoctorFeeStructure`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `clinic`, `first_time_consultation_fee`, `follow_up_fee`, `case_paper_duration`, `case_paper_renewal_fee`, `emergency_consultation_fee`, `online_consultation_fee`, `cancellation_fee`, `rescheduling_fee`, `night_consultation_fee`, `night_hours_start`, `night_hours_end`, `is_active`, `created_at`, `updated_at`

### `FollowUpPolicy`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `clinic`, `follow_up_duration`, `follow_up_fee`, `max_follow_up_visits`, `allow_online_follow_up`, `online_follow_up_fee`, `allow_free_follow_up`, `free_follow_up_days`, `auto_apply_case_paper`, `access_past_appointments`, `access_past_prescriptions`, `access_past_reports`, `access_other_clinic_history`, `created_at`, `updated_at`

### `CancellationPolicy`

- **Source:** `doctor/models.py`
- **Fields:** `doctor`, `clinic`, `allow_cancellation`, `cancellation_window_hours`, `cancellation_fee`, `allow_refund`, `refund_percentage`, `rescheduling_fee`, `is_active`, `created_at`, `updated_at`

### `DoctorAvailability`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `clinic`, `availability`, `slot_duration`, `buffer_time`, `max_appointments_per_day`, `emergency_slots`, `created_at`, `updated_at`

### `DoctorLeave`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `clinic`, `start_date`, `end_date`, `half_day`, `leave_type`, `reason`, `approved`, `created_at`, `updated_at`

### `DoctorOPDStatus`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `clinic`, `is_available`, `check_in_time`, `check_out_time`, `created_at`, `updated_at`

### `DoctorSchedulingRules`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `clinic`, `allow_same_day_appointments`, `allow_concurrent_appointments`, `max_concurrent_appointments`, `require_approval_for_new_patients`, `auto_confirm_appointments`, `allow_patient_rescheduling`, `reschedule_cutoff_hours`, `allow_patient_cancellation`, `cancellation_cutoff_hours`, `advance_booking_days`, `allow_emergency_slots`, `emergency_slots_per_day`, `is_active`, `created_at`, `updated_at`

### `DoctorMembership`

- **Source:** `doctor/models.py`
- **Fields:** `id`, `doctor`, `organization_name`, `membership_id`, `designation`, `year_of_joining`, `certificate`, `is_verified`, `created_at`, `updated_at`

### `DoctorBankDetails`

- **Source:** `doctor/models.py`
- **Fields:** `doctor`, `account_holder_name`, `account_number`, `masked_account_number`, `ifsc_code`, `bank_name`, `branch_name`, `upi_id`, `verification_status`, `verification_method`, `verified_at`, `verified_by`, `rejection_reason`, `is_active`, `created_at`, `updated_at`

<!-- auto-generated:end -->
