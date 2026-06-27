---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# FAQ — doctor

## How is doctor ID generated?

Run `python manage.py generate_doctor_ids` or assigned at registration — see `public_id` field.

## What blocks a doctor from receiving appointments?

`status != approved` or missing working hours / clinic affiliation.

## Where is KYC status checked?

`DoctorKYCStatusView`, `KYCStatus` model, admin approval flows.

## Dashboard vs legacy API?

- Legacy: `/api/doctor/`
- Dashboard v1: `/api/v1/doctors/`

## How does OPD check-in relate to queue?

`DoctorOPDCheckInView` updates OPD status; queue_management consumes for patient queue ordering.
