# Support Playbook Template

Every workflow playbook (`01`–`09`, `13`) follows this section order so a 2 AM reader never scavenges.

Copy this file when adding a new runbook. Replace placeholders. Link foundation docs instead of redefining tables or identifiers.

- Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md)
- Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)
- CloudWatch: always **See [`10_CloudWatch_Runbook.md`](10_CloudWatch_Runbook.md)** (do not paste CW recipes here)
- Heavy SQL: live in [`11_Common_SQL_Queries.md`](11_Common_SQL_Queries.md); keep 1–2 paste-ready queries max

---

# {NN}_{Workflow}_Runbook

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Patient Name  □ Mobile  □ Doctor  □ Date  □ Clinic  □ Time
  First Action: (one sentence)
  Expected Output: □ Consultation/Booking found  □ Correlation ID  □ Support Trace status
```

## 1. Purpose

One paragraph: what this runbook covers and what it does not.

## 2. Severity

| Level | Meaning |
|-------|---------|
| **P1** | Entire workflow broken (many patients / system-wide) |
| **P2** | Single patient / single booking failed |
| **P3** | Minor functional issue |
| **P4** | Cosmetic / docs only |

## 3. User may say

- Bullet list of complaint phrases.

## 4. Information to collect

- Name, mobile, doctor, clinic, date/time, any IDs (visit_pnr, order_number, prescription_pnr, correlation_id).

## 5. Escalation

| If | Escalate to |
|----|-------------|
| Domain data missing mid-journey | Developer |
| Provider / Meta / S3 failure | Infra |
| Database timeout / locks | Backend |
| CloudWatch / logging missing | DevOps |

## 6. Investigation flow

Ascii or mermaid: complaint → resolve IDs → expected DB chain → Support API → timeline → CloudWatch / shell.

## 7. Expected Database State

Chain of rows that must exist in order. **Empty table / missing row = failure point.**

Use real table names from `_foundation/01_TABLE_MAP.md` only.

## 8. API flow (prefer Support APIs)

```text
Patient / Search API
  → Domain API (consultation / order / report)
  → GET /api/v1/support/... (typed lookup or search)
  → Timeline expand / timeline endpoint
  → (Shell) IncidentReconstruction when needed
```

Note any missing REST (e.g. incident = Django shell).

## 9. Expected Audit / Trace / Logs

```text
Clinical Audit: …
Business Audit: …
Support Trace: …
CloudWatch: See 10_CloudWatch_Runbook.md — search with correlation_id / request_id
```

## 10. SQL (pointers)

- Link query IDs in `11_Common_SQL_Queries.md`
- Optionally 1–2 critical paste-ready queries

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| … | … |

## 12. Resolution

Numbered steps: verify → fix operational issue → retest Support lookup → confirm success criteria.

## 13. What Success Looks Like

```text
Success Criteria
  □ Patient outcome restored
  □ Booking/consultation terminal state OK
  □ Delivery / WhatsApp delivered (if applicable)
  □ No pending retry loop
  □ Support Trace reflects Completed (or known Failed with root cause)
```
