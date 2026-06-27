---
owner: hospital_mgmt-team
module: hospital_mgmt
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# Models — hospital_mgmt

See [shared_docs](../../shared_docs/) for cross-app registries.

<!-- auto-generated:start -->
## Model reference (auto-generated from source)

### `Hospital`

- **Source:** `hospital_mgmt/models.py`
- **Fields:** `id`, `name`, `hospital_type`, `registration_number`, `owner_name`, `owner_contact`, `address`, `contact_number`, `email_address`, `website_url`, `emergency_services`, `created_at`

### `HospitalLicensing`

- **Source:** `hospital_mgmt/models.py`
- **Fields:** `id`, `hospital`, `medical_license_details`, `certifications`, `tax_information`

### `HospitalOperationalDetails`

- **Source:** `hospital_mgmt/models.py`
- **Fields:** `id`, `hospital`, `number_of_beds`, `departments_services_offered`, `hospital_timings`, `insurance_partnerships`

### `HospitalStaffDetails`

- **Source:** `hospital_mgmt/models.py`
- **Fields:** `id`, `hospital`, `doctors`, `nurses_and_technicians`, `administrative_staff`

### `HospitalFacility`

- **Source:** `hospital_mgmt/models.py`
- **Fields:** `id`, `hospital`, `available_facilities`, `medical_equipment`, `ambulance_services`

### `HospitalDigitalInformation`

- **Source:** `hospital_mgmt/models.py`
- **Fields:** `id`, `hospital`, `hospital_management_software`, `preferred_appointment_channels`, `patient_data_management`

### `HospitalBillingInformation`

- **Source:** `hospital_mgmt/models.py`
- **Fields:** `id`, `hospital`, `billing_practices`, `discount_policies`

<!-- auto-generated:end -->
