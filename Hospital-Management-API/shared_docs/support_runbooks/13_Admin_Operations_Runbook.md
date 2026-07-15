# 13 — Admin Operations Runbook

Doctor login, profile/clinic linkage, KYC, inactive clinic — **not** clinical consultation content ([01](01_Consultation_Runbook.md)).

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Doctor username / DOC id  □ Clinic  □ Symptom (login / KYC / clinic)
  First Action: Confirm account_user + doctor_doctor + groups (doctor) + clinic M2M; retry login API
  Expected Output: □ User found  □ Group membership  □ Doctor profile / clinic link  □ Error class known
```

## 1. Purpose

Unblock staff access and clinic/doctor setup so clinical workflows can run. Does not reconstruct patient journeys ([08](08_Patient_Journey_Runbook.md)).

## 2. Severity

| Level | When |
|-------|------|
| **P1** | All doctors cannot login / all clinics inactive |
| **P2** | One doctor/clinic blocked |
| **P3** | Profile incomplete soft issues |
| **P4** | Badge/cosmetic KYC display |

## 3. User may say

- “Cannot login / invalid credentials / not authorized as doctor.”
- “Account not approved.”
- “Doctor profile / clinic missing.”
- “KYC rejected / pending.”

## 4. Information to collect

- Username (often mobile), clinic name/code, approximate last successful login
- Exact error message from `POST /api/doctor/login/` or admin login

## 5. Escalation

| If | Escalate to |
|----|-------------|
| Auth service / JWT systemic | Backend |
| KYC policy decisions | Admin product owner |
| Clinic data corruption | Developer |
| CloudWatch auth storms | DevOps — [10](10_CloudWatch_Runbook.md) |

## 6. Investigation flow

```text
POST /api/doctor/login/ (or /api/admin/login/)
  → account_user exists? groups contains doctor/admin?
  → doctor_doctor.user_id present? public_id DOC…?
  → doctor_doctor_clinics / clinic_clinic active?
  → KYC fields/status if used by product
  → CloudWatch (10) for auth errors
```

## 7. Expected Database State

```text
account_user (username, status/approval as product requires)
  → auth group membership (doctor | admin | helpdesk | …)
  → doctor_doctor (user_id, public_id)   [for doctors]
  → doctor_doctor_clinics → clinic_clinic (code CL…, active)
```

Helpdesk Support API access requires helpdesk/admin group — without it, `/api/v1/support/` returns 403.

## 8. API flow

```text
POST /api/doctor/login/          {"username","password"}
POST /api/admin/login/           {"username","password"}
Doctor / clinic admin profile endpoints per Swagger
```

Support investigation APIs are unrelated for pure login; use only after access restored if investigating patient ops.

## 9. Expected Audit / Trace / Logs

```text
Clinical/Business audits: not primary
Application logs: authentication success/failure event codes
CloudWatch: See 10 — filter module authentication if instrumented
```

## 10. SQL (pointers)

[`11`](11_Common_SQL_Queries.md) — Patient/Admin helpers as needed.

```sql
SELECT u.id, u.username, u.status, array_agg(g.name) AS groups
FROM account_user u
LEFT JOIN account_user_groups ug ON ug.user_id = u.id
LEFT JOIN auth_group g ON g.id = ug.group_id
WHERE u.username = '<username>'
GROUP BY u.id;

SELECT d.id, d.public_id, d.user_id, c.id AS clinic_id, c.code, c.name
FROM doctor_doctor d
LEFT JOIN doctor_doctor_clinics dc ON dc.doctor_id = d.id
LEFT JOIN clinic_clinic c ON c.id = dc.clinic_id
WHERE d.user_id = '<user_id>';
```

*(Confirm exact auth M2M table names in your DB if customized — Django default is `account_user_groups` for custom user.)*

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| 401 Invalid credentials | Wrong password / user missing |
| 403 not authorized as doctor | Missing `doctor` group |
| 403 not approved | `user.status` false |
| Login OK, no patients | Clinic M2M empty / wrong clinic |
| Helpdesk cannot call Support API | Missing helpdesk/admin group |

## 12. Resolution

1. Fix group membership / approval / clinic link via approved admin tools.
2. Reset password per security policy.
3. Retest login.
4. For KYC — follow admin KYC verify flow; do not bypass compliance.

## 13. What Success Looks Like

```text
Success Criteria
  □ Login returns access_token
  □ Doctor/clinic linkage correct for workspace
  □ KYC state matches admin decision
  □ User can reach intended UI / Support APIs if role requires
```
