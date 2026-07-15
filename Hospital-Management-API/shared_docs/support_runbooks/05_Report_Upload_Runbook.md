# 05 — Report Upload Runbook

Lab PDF / artifact upload, duplicate reports, storage failures. Delivery to patient → [06](06_Report_Delivery_Runbook.md).

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Patient Name  □ Mobile  □ order_number / booking_id  □ Date  □ Lab
  First Action: Resolve order → report_id → GET /api/v1/support/report/{report_id}?expand=timeline,summary,health
  Expected Output: □ Report row  □ Artifact present  □ Correlation ID  □ Support Trace status
```

## 1. Purpose

Investigate missing uploads, failed storage, empty artifacts, superseding/duplicate confusion for `diagnostics_engine_diagnostictestreport`.

## 2. Severity

| Level | When |
|-------|------|
| **P1** | All lab uploads failing (S3 / API) |
| **P2** | Single order/report missing file |
| **P3** | Duplicate uploads / UI confusion |
| **P4** | Filename cosmetic |

## 3. User may say

- “Lab uploaded but patient/doctor cannot see report.”
- “Upload failed / timeout.”
- “Wrong PDF / duplicate report.”
- “Report stuck PENDING.”

## 4. Information to collect

- Order number, lab branch, upload time, error screenshot

## 5. Escalation

| If | Escalate to |
|----|-------------|
| S3 / credentials / storage | Infra |
| Report row never created | Developer |
| Status machine stuck | Developer |
| CloudWatch | DevOps — [10](10_CloudWatch_Runbook.md) |

## 6. Investigation flow

```text
booking_id → order test lines → diagnostictestreport
  → GET /api/v1/support/report/{report_id}?expand=timeline,summary,health
  → SQL: diagnostictestreport + diagnosticreportartifact
  → clinical_audit: report.uploaded
  → CloudWatch / storage errors (10)
```

## 7. Expected Database State

```text
diagnostics_engine_diagnosticordertestline
  → diagnostics_engine_diagnostictestreport (status progresses from PENDING)
  → diagnostics_engine_diagnosticreportartifact (≥1 file; artifact_public_id)
  → clinical_audit report.uploaded (and ready transitions as wired)
  → support_trace.report_id set
```

**Report without artifact** = upload incomplete.  
**No report row** = upload never started.

## 8. API flow

```text
GET /api/v1/support/booking/{booking_id}?expand=relationships
GET /api/v1/support/report/{report_id}?expand=timeline,summary,health
GET /api/v1/diagnostics/... (domain report detail — confirm with Swagger)
```

## 9. Expected Audit / Trace / Logs

```text
Clinical Audit: report.uploaded (then viewed/downloaded/shared later)
Business Audit: report.ready / delivery_* when delivery starts
Support Trace:  report_id; last_event upload/ready
CloudWatch:     See 10 — include storage errors
```

## 10. SQL (pointers)

[`11`](11_Common_SQL_Queries.md) — Report.

```sql
SELECT r.id, r.status, r.order_test_line_id, r.report_number, r.created_at
FROM diagnostics_engine_diagnostictestreport r
JOIN diagnostics_engine_diagnosticordertestline tl ON tl.id = r.order_test_line_id
WHERE tl.order_id = '<booking_id>'
ORDER BY r.created_at DESC;

SELECT id, report_id, artifact_public_id, report_public_id
FROM diagnostics_engine_diagnosticreportartifact
WHERE report_id = '<report_id>';
```

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| Upload 500 | S3, size limits, auth for lab user |
| PENDING forever | Ready workflow not invoked |
| Duplicate reports | Re-upload / supersedes_id chain |
| Support report 404 | Wrong UUID vs public id |

## 12. Resolution

1. Confirm report + artifact rows.
2. Retry upload via lab UI if no artifact; escalate Infra on storage errors.
3. Mark ready per product process if stuck PENDING.
4. Retest Support report + booking relationships.

## 13. What Success Looks Like

```text
Success Criteria
  □ DiagnosticTestReport exists with non-empty artifact(s)
  □ Status appropriate (ready for delivery if claimed)
  □ report.uploaded audit present
  □ Support Trace indexes report_id
  □ Delivery handoff verified (06) if patient waiting
```
