---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Services — doctor

| Module | Responsibility |
|---|---|
| `services/` (if present) | Domain helpers for scheduling |
| `api/views/` | Onboarding, KYC, profile, OPD, working hours |
| `signals.py` | Profile update side effects |

## Onboarding flow

`DoctorOnboardingPhase1View` → document uploads → `KYCVerifyView` → `status=approved`.

## Scheduling

- `DoctorWorkingHoursView` / `DoctorSchedulingRulesViewSet` — slot input for appointments
- `DoctorLeave*` views — block availability
- `DoctorOPDCheckInView` / `DoctorOPDCheckOutView` — sync with queue_management

## ID generation

Management command: `generate_doctor_ids.py` — assigns `public_id`.

## Dependencies

- `account.User` (OneToOne)
- `clinic.Clinic` (membership)

## Transaction boundaries

KYC and profile updates use atomic saves per view; multi-model onboarding may use `@transaction.atomic` in views.
