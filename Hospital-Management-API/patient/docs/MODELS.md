---
owner: patient-team
module: patient
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Models — patient

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `patient`

- **Source:** `patient/models.py`
- **Fields:** `id`, `age`, `address`, `mobile`, `user`, `clinics`, `created_at`, `updated_at`

### `patient_history`

- **Source:** `patient/models.py`
- **Fields:** `id`, `Cardiologist`, `Dermatologists`, `Emergency_Medicine_Specialists`, `Immunologists`, `Anesthesiologists`, `Colon_and_Rectal_Surgeons`, `department_choices`, `admit_date`, `symptomps`, `department`, `release_date`, `patient`, `assigned_doctor`

### `Appointment`

- **Source:** `patient/models.py`
- **Fields:** `id`, `appointment_date`, `appointment_time`, `status`, `patient_history`, `doctor`

### `patient_cost`

- **Source:** `patient/models.py`
- **Fields:** `id`, `room_charge`, `medicine_cost`, `doctor_fee`, `other_charge`, `patient_details`

<!-- auto-generated:end -->
