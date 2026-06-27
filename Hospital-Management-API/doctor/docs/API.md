---
owner: doctor-team
module: doctor
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# API Reference — doctor

## Base paths

| Prefix | Purpose |
|---|---|
| `/api/doctor/` | Profile, KYC, scheduling, auth |
| `/api/v1/doctors/` | Dashboard APIs |

## Key endpoint groups

| Group | Examples |
|---|---|
| Auth | Login, logout, token refresh |
| Onboarding | Phase 1 registration, KYC upload, verify |
| Profile | CRUD profile, photo, signature, bank |
| Credentials | Education, specialization, licenses |
| Scheduling | Working hours, leaves, availability preview, OPD check-in/out |
| Fees | Fee structure, follow-up/cancellation policies |
| Search | Doctor search for appointments |

See `doctor/api/urls.py` and `doctor/api/dashboard_urls.py`.

## Side effects

- Profile update signals → cache invalidation
- OPD check-in → queue_management sync
- Working hours → appointments slot generation input

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

| Route | View | Source |
|---|---|---|
| `address/` | address_view | urls.py |
| `` | — | urls.py |
| `check-doctor-user/` | as_view | urls.py |
| `onboarding/phase1/` | as_view | urls.py |
| `profile/` | as_view | urls.py |
| `login/` | as_view | urls.py |
| `logout/` | as_view | urls.py |
| `token/refresh/` | as_view | urls.py |
| `token/verify/` | as_view | urls.py |
| `register/` | as_view | urls.py |
| `doctor-details/` | as_view | urls.py |
| `user-details/` | as_view | urls.py |
| `proflie-details/` | as_view | urls.py |
| `helpdesk/pending-requests/` | as_view | urls.py |
| `helpdesk/approve/<uuid:helpdesk_user_id>/` | as_view | urls.py |
| `registration/` | as_view | urls.py |
| `government-id/` | government_id_view | urls.py |
| `bank-details/` | bank_details_view | urls.py |
| `bank-details/<int:pk>/` | bank_details_detail_view | urls.py |
| `upload-photo/` | as_view | urls.py |
| `me/` | as_view | urls.py |
| `kyc/upload/registration/` | as_view | urls.py |
| `kyc/upload/education/` | as_view | urls.py |
| `kyc/upload/govt-id/` | as_view | urls.py |
| `kyc/upload/digital-signature/` | as_view | urls.py |
| `kyc/status/` | as_view | urls.py |
| `kyc/admin-verify/<uuid:doctor_id>/` | as_view | urls.py |
| `search-doctors/` | as_view | urls.py |
| `doctors-availability/` | as_view | urls.py |
| `doctor-leave-create/` | as_view | urls.py |
| `doctor-leave-list/` | as_view | urls.py |
| `doctor-leave-update/<uuid:pk>/` | as_view | urls.py |
| `doctor-leave-delete/<uuid:pk>/` | as_view | urls.py |
| `working-hours/` | as_view | urls.py |
| `availability-preview/` | as_view | urls.py |
| `opd-status/check-in/` | as_view | urls.py |
| `opd-status/check-out/` | as_view | urls.py |
| `opd-status/` | as_view | urls.py |

<!-- auto-generated:api:end -->
