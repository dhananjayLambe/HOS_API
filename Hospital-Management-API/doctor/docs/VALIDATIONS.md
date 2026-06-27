---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Validations — doctor

| Validation | Reason |
|---|---|
| Doctor `status` must be `approved` for public booking | KYC gate |
| Working hours end > start | Valid schedule |
| Leave dates do not overlap inconsistently | Scheduling integrity |
| Registration / license numbers unique per doctor | Credential dedup |
| Phone format on secondary mobile | Contact validity |
| Digital signature consent before signature upload | Legal consent |

## KYC validations

Government ID, education certificates, registration certificate — file type/size enforced in upload views.

## Scheduling validations

`DoctorAvailabilityPreviewView` validates slot conflicts before appointments book.
