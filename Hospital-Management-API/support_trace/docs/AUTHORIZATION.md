# API Authorization

Support Investigation APIs require JWT authentication with support/admin role.

## Allowed groups

- `superadmin`
- `admin`
- `helpdesk`
- `helpdesk_admin`
- `operations`

## Policy mapping

| Role | InvestigationPolicy |
|------|---------------------|
| helpdesk | `for_patient_investigation()` — PII masked |
| admin / superadmin | `for_admin()` — full access |

Patient authentication is **never** accepted on these endpoints.
