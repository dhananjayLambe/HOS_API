# 01 — Consultation Runbook

Covers encounter creation, consultation start/complete, symptoms, vitals, diagnosis. For patient-wide reconstruction start with [08_Patient_Journey_Runbook.md](08_Patient_Journey_Runbook.md).

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Patient Name  □ Mobile  □ Doctor  □ Date  □ Clinic  □ Time
  First Action: Resolve patient → encounter/consultation_id → GET /api/v1/support/consultation/{id}?expand=timeline,summary,health
  Expected Output: □ Encounter found  □ Consultation row  □ Correlation ID  □ Support Trace status
```

## 1. Purpose

Investigate missing or incomplete consultations: not created, cannot start/complete, missing symptoms/vitals/diagnosis, stuck status.

**Out of scope:** Prescription share WhatsApp ([07](07_WhatsApp_Delivery_Runbook.md)), diagnostic booking ([03](03_Diagnostic_Test_Booking_Runbook.md)), admin login ([13](13_Admin_Operations_Runbook.md)).

## 2. Severity

| Level | When |
|-------|------|
| **P1** | Doctors cannot start/end consultations clinic-wide |
| **P2** | One patient visit blocked or incomplete |
| **P3** | Audit/timeline gap after successful clinical complete |
| **P4** | UI wording only |

## 3. User may say

- “Consultation not created / blank after pre-consult.”
- “Cannot end consultation / stuck.”
- “Symptoms / vitals / diagnosis not saving.”
- “Patient says doctor saw them but system shows no visit.”

## 4. Information to collect

- Patient name/mobile, doctor, clinic, date/time
- `visit_pnr` if known
- Screenshot of UI error

## 5. Escalation

| If | Escalate to |
|----|-------------|
| Encounter missing after create API succeeds | Developer |
| DB locks / timeouts | Backend |
| Auth / doctor group issues | [13 Admin Ops](13_Admin_Operations_Runbook.md) / Backend |
| CloudWatch empty | DevOps — [10](10_CloudWatch_Runbook.md) |

## 6. Investigation flow

```text
Patient search → summary → consultation_id / encounter_id
  → Domain: GET encounter / consultation APIs as needed
  → GET /api/v1/support/consultation/{consultation_id}?expand=timeline,summary,health,audits
  → SQL: encounter + consultation + clinical_audit
  → CloudWatch: correlation_id (10)
```

## 7. Expected Database State

```text
patient_account_patientprofile
  → consultations_core_clinicalencounter (status progressing; visit_pnr set)
  → consultations_core_preconsultation (+ vitals section row if recorded)
  → consultations_core_consultation (after start)
  → symptoms / diagnosis / findings tables as applicable
  → clinical_audit rows: consultation.started … consultation.completed
  → support_trace indexed by consultation_id / encounter_id
```

Missing `consultations_core_consultation` after start API → fail before clinical content.  
Missing audit / trace with successful complete → observability issue (lower clinical severity).

## 8. API flow

```text
GET /api/patients/search/?query=...
GET /api/patients/{profile_id}/summary/
GET /api/consultations/encounter/{encounter_id}/
GET /api/v1/support/consultation/{consultation_id}?expand=timeline,summary,health,relationships,audits
GET /api/v1/support/search?q={visit_pnr|encounter_id}
```

## 9. Expected Audit / Trace / Logs

```text
Clinical Audit: consultation.started → (vitals.recorded / symptoms.recorded / diagnosis.added) → consultation.completed
Support Trace:  workflow Consultation; status Running → Completed
CloudWatch:     See 10 — correlation_id from X-Correlation-ID / audit row
```

## 10. SQL (pointers)

[`11_Common_SQL_Queries.md`](11_Common_SQL_Queries.md) — Consultation.

```sql
SELECT e.id AS encounter_id, e.visit_pnr, e.status, c.id AS consultation_id, c.started_at, c.is_finalized
FROM consultations_core_clinicalencounter e
LEFT JOIN consultations_core_consultation c ON c.encounter_id = e.id
WHERE e.patient_account_id = '<patient_account_id>'
ORDER BY e.created_at DESC
LIMIT 10;

SELECT action, timestamp, correlation_id
FROM clinical_audit
WHERE consultation_id = '<consultation_id>'
ORDER BY timestamp;
```

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| Pre-consult OK, no consultation | Start consultation never called / failed auth |
| Cannot complete | Validation on Rx/diagnosis payload; unfinished sections |
| Symptoms missing | Section write failed; wrong encounter |
| Audit empty, UI shows done | Fail-open audit / correlation context cleared |

## 12. Resolution

1. Confirm encounter + consultation rows (§7).
2. If missing clinical data — unblock doctor via UI retry or known payload fix; escalate if API 5xx.
3. Re-check Support consultation timeline.
4. Document correlation_id.

## 13. What Success Looks Like

```text
Success Criteria
  □ Encounter + consultation present for the visit
  □ Clinical content matches doctor report (symptoms/Dx as claimed)
  □ consultation.completed audit present when visit closed
  □ Support Trace reflects Completed (or Running if in-flight)
  □ Patient can continue to Rx / booking if needed
```
