---
owner: appointments-team
module: appointments
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Models — appointments

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `Appointment`

- **Source:** `appointments/models/appointment.py`
- **Fields:** `id`, `patient_account`, `patient_profile`, `doctor`, `clinic`, `appointment_date`, `slot_start_time`, `slot_end_time`, `STATUS_CHOICES`, `status`, `check_in_time`, `PAYMENT_STATUS_CHOICES`, `payment_status`, `payment_mode`, `consultation_fee`, `consultation_mode`, `booking_source`, `appointment_type`, `previous_appointment`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`

### `AppointmentHistory`

- **Source:** `appointments/models/appointment.py`
- **Fields:** `id`, `appointment`, `status`, `changed_by`, `comment`, `created_at`

<!-- auto-generated:end -->
