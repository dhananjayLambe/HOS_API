# 02 — Prescription Runbook

Generate / finalize / PNR / download. WhatsApp prescription delivery → also open [07_WhatsApp_Delivery_Runbook.md](07_WhatsApp_Delivery_Runbook.md).

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Patient Name  □ Mobile  □ Doctor  □ Date  □ Clinic  □ prescription_pnr
  First Action: Patient summary → prescription_id / consultation_id → GET /api/v1/support/prescription/{id}?expand=timeline,summary
  Expected Output: □ Prescription row  □ PNR  □ Correlation ID  □ Support Trace status
```

## 1. Purpose

Investigate prescription creation, finalize/sign, PNR, PDF/share issues. Clinical consultation issues → [01](01_Consultation_Runbook.md). Delivery channel failures → [07](07_WhatsApp_Delivery_Runbook.md).

## 2. Severity

| Level | When |
|-------|------|
| **P1** | Prescription finalize broken for all doctors |
| **P2** | One patient missing or unusable prescription |
| **P3** | Share/delivery soft failure after finalize |
| **P4** | Print layout cosmetic |

## 3. User may say

- “Prescription not generated / no PNR.”
- “Cannot finalize / sign.”
- “Patient did not get WhatsApp prescription.”
- “Wrong medicines on PDF.”

## 4. Information to collect

- Patient mobile/name, visit date, doctor
- `prescription_pnr` if shown; medicine list claimed

## 5. Escalation

| If | Escalate to |
|----|-------------|
| Finalize 5xx / no prescription row | Developer |
| PDF / storage failure | Infra (S3) |
| WhatsApp not sent | [07](07_WhatsApp_Delivery_Runbook.md) / Infra |
| CloudWatch | DevOps — [10](10_CloudWatch_Runbook.md) |

## 6. Investigation flow

```text
Patient summary → prescriptions[].id / consultation_id
  → GET /api/v1/support/prescription/{prescription_id}?expand=timeline,summary,health
  → SQL: consultations_core_prescription + lines
  → clinical_audit: prescription.created / prescription.signed
  → If share issue: whatsapp_messages by prescription_id → 07
```

## 7. Expected Database State

```text
consultations_core_consultation
  → consultations_core_prescription (status FINALIZED; prescription_pnr set)
  → consultations_core_prescriptionline (≥1 active line when claimed)
  → clinical_audit: prescription.created, prescription.signed (as wired)
  → support_trace.prescription_id set
  → (optional) whatsapp_messages.prescription_id for share
```

## 8. API flow

```text
GET /api/patients/{profile_id}/summary/
GET /api/v1/support/prescription/{prescription_id}?expand=timeline,summary,health
GET /api/v1/support/consultation/{consultation_id}?expand=timeline,audits
GET /api/v1/support/search?q={prescription_pnr}
```

## 9. Expected Audit / Trace / Logs

```text
Clinical Audit: prescription.created → prescription.signed (and related)
Support Trace:  prescription_id indexed; status aligns with consultation complete
CloudWatch:     See 10 — correlation_id from end-consultation request
```

## 10. SQL (pointers)

[`11`](11_Common_SQL_Queries.md) — Prescription.

```sql
SELECT id, consultation_id, prescription_pnr, status, is_active, finalized_at
FROM consultations_core_prescription
WHERE consultation_id = '<consultation_id>'
ORDER BY created_at DESC;

SELECT pl.id, pl.drug_id, pl.custom_medicine_id
FROM consultations_core_prescriptionline pl
WHERE pl.prescription_id = '<prescription_id>' AND pl.deleted_at IS NULL;
```

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| No prescription row | End consultation not run / validation failed |
| DRAFT forever | Finalize not reached |
| Empty lines | Medicine search / payload issue |
| WA not delivered | Channel — use 07 |

## 12. Resolution

1. Confirm prescription + lines + PNR.
2. If DRAFT — guide doctor to complete consultation correctly.
3. If WA claimed — follow 07 with `prescription_id` / mobile.
4. Retest Support prescription lookup.

## 13. What Success Looks Like

```text
Success Criteria
  □ Prescription FINALIZED with prescription_pnr
  □ Lines match clinical intent
  □ Audit events present for create/sign
  □ Support Trace indexes prescription_id
  □ Share/delivery confirmed if requested (07)
```
