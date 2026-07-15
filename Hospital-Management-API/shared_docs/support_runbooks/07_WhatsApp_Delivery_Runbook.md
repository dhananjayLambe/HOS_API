# 07 — WhatsApp Delivery Runbook

Token, template, phone format, webhook, delivery status for `whatsapp_messages`. Used for recommendation, prescription share, report share.

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Patient Name  □ Mobile  □ Date  □ Message type (Rx / recommend / report)
  First Action: Search whatsapp_messages by recipient_mobile_number → GET /api/v1/support/whatsapp/{id} or search?q={mobile|wamid}
  Expected Output: □ Message row  □ Status  □ Correlation / Support Trace  □ Provider error if any
```

## 1. Purpose

Debug WhatsApp outbound failures and webhook callbacks. Clinical content correctness is out of scope (use 01–06).

## 2. Severity

| Level | When |
|-------|------|
| **P1** | All WhatsApp sends failing (token/template/provider) |
| **P2** | One patient message failed |
| **P3** | Delayed delivery / retry succeeded |
| **P4** | Template wording |

## 3. User may say

- “WhatsApp not received.”
- “Message stuck / failed.”
- “Wrong template / parameters.”
- “Webhook not updating status.”

## 4. Information to collect

- Exact mobile (with country code), approx send time, message type
- Meta message id (`wamid…`) if in screenshot
- Environment (sandbox vs prod templates)

## 5. Escalation

| If | Escalate to |
|----|-------------|
| Meta API 401/403 / token | Infra |
| Template not approved | Infra / product |
| Row never inserted | Developer |
| Webhook verify/signature | Infra |
| CloudWatch | DevOps — [10](10_CloudWatch_Runbook.md) |

## 6. Investigation flow

```text
Mobile / wamid / prescription_id / report_id / order_id
  → SQL whatsapp_messages
  → GET /api/v1/support/whatsapp/{message_id}?expand=timeline,summary,health
  → GET /api/v1/support/search?q={mobile}
  → business_audit communication events
  → CloudWatch (10) for provider response
```

## 7. Expected Database State

```text
Domain entity (prescription | diagnostic_order | diagnostictestreport)
  → whatsapp_messages (
        recipient_mobile_number,
        status: queued → sent → delivered | failed,
        meta_message_id when accepted by Meta,
        FKs set
     )
  → business_audit WhatsApp / report delivery events
  → support_trace.whatsapp_message_id / phone_number
```

## 8. API flow

```text
GET /api/v1/support/search?q={mobile}&expand=timeline,summary,health
GET /api/v1/support/phone/{phone}
GET /api/v1/support/whatsapp/{message_id}?expand=timeline,summary,health
```

Webhook health: notifications WhatsApp webhook endpoints (verify token) — see product ops / Infra.

## 9. Expected Audit / Trace / Logs

```text
Business Audit: recommendation.sent / report.whatsapp_* / delivery failed|retried
Support Trace:  Failed with retry_count when looping
CloudWatch:     See 10 — Meta HTTP status in logs
```

## 10. SQL (pointers)

[`11`](11_Common_SQL_Queries.md) — WhatsApp.

```sql
SELECT id, status, recipient_mobile_number, meta_message_id, template_name,
       prescription_id, diagnostic_order_id, diagnostic_test_report_id, created_at
FROM whatsapp_messages
WHERE recipient_mobile_number LIKE '%9876543210%'
ORDER BY created_at DESC
LIMIT 20;
```

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| No row | Feature flag off; orchestrator never ran |
| FAILED immediately | Invalid phone; template params; token |
| SENT not DELIVERED | User phone offline; webhook lag |
| Wrong patient | Incorrect recipient on share API |

## 12. Resolution

1. Fix phone format / re-send via allowed UI.
2. Infra: rotate token, verify template name/language.
3. Confirm webhook processing if status frozen at SENT.
4. Retest Support WhatsApp + phone search.

## 13. What Success Looks Like

```text
Success Criteria
  □ whatsapp_messages row for intended mobile + entity FK
  □ Status SENT or DELIVERED (or FAILED with documented Meta cause)
  □ Support Trace / timeline shows communication event
  □ No pending retry storm
  □ Patient confirms receipt when P2 care-impacting
```
