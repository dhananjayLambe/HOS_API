---
owner: patient_account-team
module: patient_account
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# API Reference — patient_account

Base: `/api/patients/`

| Area | Purpose |
|---|---|
| Registration / profile | CRUD patient profile |
| Search | Staff lookup |
| Reports access | Patient diagnostic reports (via diagnostics APIs) |

## PII

Name, phone, DOB, address — see [DATA_LIFECYCLE.md](../../shared_docs/DATA_LIFECYCLE.md).

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

| Route | View | Source |
|---|---|---|
| `` | — | urls.py |
| `check-user/` | as_view | urls.py |
| `send-otp/` | as_view | urls.py |
| `verify-otp/` | as_view | urls.py |
| `refresh-token/` | as_view | urls.py |
| `logout/` | as_view | urls.py |
| `register/` | as_view | urls.py |
| `patient-account/` | get_patient_account | urls.py |
| `add-profile/` | as_view | urls.py |
| `update-profile-details/<uuid:profile_id>/` | as_view | urls.py |
| `get-patient-profiles/` | as_view | urls.py |
| `delete-profile/<uuid:profile_id>/` | as_view | urls.py |
| `get-profile-by-name/<str:first_name>/` | as_view | urls.py |
| `get-primary-profile/` | as_view | urls.py |
| `check-patient/` | as_view | urls.py |
| `search/` | as_view | urls.py |
| `list/` | as_view | urls.py |
| `<uuid:patient_profile_id>/summary/` | as_view | urls.py |
| `check-mobile/` | as_view | urls.py |
| `create/` | as_view | urls.py |
| `<uuid:patient_account_id>/profiles/` | as_view | urls.py |
| `select/` | as_view | urls.py |
| `selected/` | as_view | urls.py |
| `selected/clear/` | as_view | urls.py |

<!-- auto-generated:api:end -->
