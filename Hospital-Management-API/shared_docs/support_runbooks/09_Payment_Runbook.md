# 09 — Payment Runbook

## MVP status: **Not enabled as a standalone Payment domain**

DoctorProCare currently has **no `Payment` model / payment table**. Appointment fee fields live on `appointments_appointment` (`payment_status`, `payment_mode`, `consultation_fee`). Support Trace may index `payment_id` / `invoice_id` strings for future Razorpay-style IDs — treat as **optional / future**.

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Patient Name  □ Mobile  □ Appointment / visit context  □ “Payment” complaint detail
  First Action: Confirm whether complaint is appointment fee UI vs external gateway. Check appointments_appointment payment_* fields. Do NOT invent a payments table.
  Expected Output: □ Appointment found  □ payment_status noted  □ Escalation path chosen (or N/A)
```

## 1. Purpose

Route payment-like complaints correctly until a real payments module ships. Prevent support from hunting nonexistent tables.

## 2. Severity

| Level | When |
|-------|------|
| **P1** | N/A unless misconfigured fee blocks all bookings |
| **P2** | Single appointment fee / status wrong |
| **P3** | Display-only fee mismatch |
| **P4** | Docs |

## 3. User may say

- “Payment failed / not reflected.”
- “Consultation fee wrong.”
- “Invoice / Razorpay id …”

## 4. Information to collect

- Patient, appointment time, any gateway reference (if external)
- Screenshot of fee UI

## 5. Escalation

| If | Escalate to |
|----|-------------|
| Expectation of gateway charge with no product feature | Product / Developer — feature gap |
| Appointment `payment_status` wrong | Developer |
| Caller insists on `support_trace.payment_id` | Backend — confirm if populated |

## 6. Investigation flow

```text
Patient / appointment context
  → SQL appointments_appointment payment_status / payment_mode / consultation_fee
  → Optional: support_trace WHERE payment_id IS NOT NULL (usually empty)
  → If gateway proof exists: escalate Product (not ops invent)
```

## 7. Expected Database State

```text
appointments_appointment
  · payment_status
  · payment_mode
  · consultation_fee

(No payments / invoices table in MVP)
```

## 8. API flow

```text
Domain appointment APIs (as applicable in Swagger)
GET /api/v1/support/search?q={payment_ref}   # only if product later stores pay_ ids
```

## 9. Expected Audit / Trace / Logs

```text
Business Audit: payment workflow types may exist in enums but production wiring may be absent
Support Trace:  payment_id usually null
CloudWatch:     See 10 only if API errors on appointment fee paths
```

## 10. SQL (pointers)

```sql
SELECT id, patient_account_id, doctor_id, clinic_id, payment_status, payment_mode, consultation_fee, status, created_at
FROM appointments_appointment
WHERE patient_account_id = '<patient_account_id>'
ORDER BY created_at DESC
LIMIT 10;
```

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| “Payment failed” with no gateway | Feature not live — set expectation |
| Fee wrong | Clinic/doctor fee config |
| Searching payments table | Operator error — use this stub |

## 12. Resolution

1. Explain MVP: no gateway payment module.
2. Correct appointment fee fields only via approved admin/product process.
3. File product ticket if gateway required.
4. Close with documented expectation.

## 13. What Success Looks Like

```text
Success Criteria
  □ Complaint typed (fee UI vs phantom gateway)
  □ Appointment payment_* fields reviewed
  □ No false SQL against nonexistent payments table
  □ Product/dev ticket filed if gap
```
