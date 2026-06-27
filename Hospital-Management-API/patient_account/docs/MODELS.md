---
owner: patient_account-team
module: patient_account
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Models — patient_account

## PatientProfile

| Field | Description |
|---|---|
| Purpose | Canonical patient identity |
| Owner | patient_account |
| Constraints | Phone unique; DOB immutable (INV-009) |
| Signals | PATIENT_CREATED, PATIENT_UPDATED |

## Relationships

Consumed by appointments, consultations_core, diagnostics_engine, reports.

Base API: `/api/patients/`

## Permissions

Patient self-service vs staff — see [PERMISSIONS.md](PERMISSIONS.md).

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `PatientAccount`

- **Source:** `patient_account/models.py`
- **Fields:** `id`, `user`, `clinics`, `alternate_mobile`, `preferred_language`, `created_by`, `onboarding_source`, `is_active`, `created_at`, `updated_at`

### `PatientProfile`

- **Source:** `patient_account/models.py`
- **Fields:** `RELATION_CHOICES`, `GENDER_CHOICES`, `id`, `public_id`, `account`, `first_name`, `last_name`, `relation`, `gender`, `date_of_birth`, `age_years`, `age_months`, `is_active`, `created_at`, `updated_at`

### `PatientProfileDetails`

- **Source:** `patient_account/models.py`
- **Fields:** `BLOOD_GROUP_CHOICES`, `profile`, `profile_photo`, `age`, `blood_group`, `created_at`, `updated_at`

### `PatientAddress`

- **Source:** `patient_account/models.py`
- **Fields:** `HOME`, `WORK`, `OTHER`, `ADDRESS_CHOICES`, `id`, `account`, `address_type`, `street`, `city`, `state`, `country`, `pincode`, `latitude`, `longitude`, `created_at`, `updated_at`

### `MedicalHistory`

- **Source:** `patient_account/models.py`
- **Fields:** `id`, `patient_profile`, `allergies`, `chronic_conditions`, `past_surgeries`, `ongoing_medications`, `immunizations`, `family_history`, `created_at`, `updated_at`

### `HealthMetrics`

- **Source:** `patient_account/models.py`
- **Fields:** `id`, `patient_profile`, `height`, `weight`, `bmi`, `blood_pressure`, `heart_rate`, `temperature`, `respiratory_rate`, `oxygen_saturation`, `glucose_level`, `cholesterol_level`, `hbA1c`, `body_fat_percentage`, `muscle_mass`, `waist_to_hip_ratio`, `sleep_duration`, `daily_steps`, `physical_activity_level`, `menstrual_cycle_regular`, `pregnancy_status`, `created_at`, `updated_at`

### `AuditLog`

- **Source:** `patient_account/models.py`
- **Fields:** `id`, `patient_profile`, `action`, `timestamp`, `created_at`, `updated_at`

### `OTP`

- **Source:** `patient_account/models.py`
- **Fields:** `user`, `otp`, `created_at`, `is_verified`

<!-- auto-generated:end -->
