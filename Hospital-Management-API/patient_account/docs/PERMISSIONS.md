---
owner: patient_account-team
module: patient_account
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Permissions — patient_account

| Action | Patient (self) | Doctor | Admin | Helpdesk |
|---|---|---|---|---|
| View own profile | ✅ | ✅ (linked patients) | ✅ | ✅ |
| Edit own profile | ✅ | ❌ | ✅ | ✅ |
| Edit DOB | ❌ | ❌ | ❌ | ❌ |
| Register new patient | ✅ | ❌ | ✅ | ✅ |
| Search patients | ❌ | ✅ | ✅ | ✅ |

INV-009: Date of birth immutable after creation.
