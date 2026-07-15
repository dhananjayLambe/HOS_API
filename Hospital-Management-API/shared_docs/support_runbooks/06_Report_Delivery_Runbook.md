# 06 — Report Delivery Runbook

“Booked / uploaded but patient never got the report.” Covers ready → share/portal/WhatsApp delivery path. Channel-specific WA debugging → also [07](07_WhatsApp_Delivery_Runbook.md). Upload missing → [05](05_Report_Upload_Runbook.md).

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Patient Name  □ Mobile  □ order_number / report_id  □ Date
  First Action: Confirm report uploaded (05) → GET /api/v1/support/report/{id}?expand=timeline,summary,health → check whatsapp_messages / delivery logs
  Expected Output: □ Report ready  □ Delivery attempt found  □ Correlation ID  □ Support Trace status
```

## 1. Purpose

Investigate failure after report exists: not marked ready, delivery not requested, WhatsApp/email/SMS failure, retries looping.

## 2. Severity

| Level | When |
|-------|------|
| **P1** | All report deliveries failing |
| **P2** | One patient never received report |
| **P3** | Delivered late / retry recovered |
| **P4** | Link format cosmetic |

## 3. User may say

- “Tests done, report uploaded, patient got nothing.”
- “WhatsApp report not delivered.”
- “Delivery stuck / retrying.”
- “Wrong phone got the report.”

## 4. Information to collect

- Patient mobile used for delivery, report share time, channel (WA/portal)

## 5. Escalation

| If | Escalate to |
|----|-------------|
| Report not ready / no artifact | [05](05_Report_Upload_Runbook.md) / Lab |
| WhatsApp Meta failure | Infra / [07](07_WhatsApp_Delivery_Runbook.md) |
| Async Celery stuck | Backend / [12](12_Emergency_Runbook.md) |
| CloudWatch | DevOps — [10](10_CloudWatch_Runbook.md) |

## 6. Investigation flow

```text
GET /api/v1/support/report/{report_id}?expand=timeline,summary,health,relationships
  → Confirm upload events then delivery events
  → SQL: lab_report_delivery_logs; whatsapp_messages where diagnostic_test_report_id
  → business_audit: report.ready → report.whatsapp_* / delivery_*
  → Shell reconstruct_booking if full narrative needed
  → CloudWatch (10)
```

## 7. Expected Database State

```text
diagnostics_engine_diagnostictestreport (ready)
  → diagnosticreportartifact present
  → business_audit delivery / WhatsApp events
  → whatsapp_messages (diagnostic_test_report_id) with SENT/DELIVERED status if WA path
  → lab_report_delivery_logs (if used)
  → support_trace last_event delivery-related; retry_count sane
```

## 8. API flow

```text
GET /api/v1/support/report/{report_id}?expand=timeline,summary,health,relationships
GET /api/v1/support/booking/{booking_id}?expand=timeline
GET /api/v1/support/whatsapp/{message_id}?expand=summary,health
GET /api/v1/support/phone/{mobile}?expand=timeline
```

## 9. Expected Audit / Trace / Logs

```text
Clinical: report.shared / report.viewed / report.downloaded as applicable
Business: report.ready → delivery requested → WhatsApp delivered|failed
Support Trace: Completed or Failed with retry_count
CloudWatch: See 10
```

## 10. SQL (pointers)

[`11`](11_Common_SQL_Queries.md) — Report + WhatsApp.

```sql
SELECT id, recipient_mobile_number, status, meta_message_id, diagnostic_test_report_id, created_at
FROM whatsapp_messages
WHERE diagnostic_test_report_id = '<report_id>'
ORDER BY created_at DESC;

SELECT action, state_after, retry_count, correlation_id, sequence_no
FROM business_audit
WHERE resource_id = '<report_id>' OR resource_id = '<booking_id>'
ORDER BY sequence_no;
```

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| No WA row | Share never requested / wrong channel |
| WA FAILED | Template, token, phone format — 07 |
| Ready but no delivery audit | Async task not run / CELERY down |
| Wrong mobile | recipient_mobile_number mismatch vs account_user.username |

## 12. Resolution

1. Verify upload/ready (05).
2. Confirm delivery attempt rows; fix phone / re-send via product flow.
3. Deep WA → 07.
4. Confirm Support Trace terminal + patient outcome.

## 13. What Success Looks Like

```text
Success Criteria
  □ Report ready with artifact
  □ Delivery attempt present and successful (or accepted portal path)
  □ WhatsApp DELIVERED/SENT if WA channel claimed
  □ No endless retry loop
  □ Support Trace reflects Completed (or Failed with root cause doc)
```
