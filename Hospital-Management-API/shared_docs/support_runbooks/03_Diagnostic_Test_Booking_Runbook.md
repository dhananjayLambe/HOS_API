# 03 — Diagnostic Test Booking Runbook

**Booking** = `diagnostics_engine_diagnosticorder` (PK UUID = Support Trace `booking_id`). Human id = `order_number`. Do not look for a fictional `bookings` table.

Recommendation → order → pricing → routing → lab assign. Deep routing → [04](04_Routing_Runbook.md). Reports → [05](05_Report_Upload_Runbook.md)/[06](06_Report_Delivery_Runbook.md).

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Patient Name  □ Mobile  □ Doctor  □ Date  □ order_number / booking_id
  First Action: Resolve consultation → DiagnosticOrder UUID → GET /api/v1/support/booking/{booking_id}?expand=timeline,summary,health,relationships
  Expected Output: □ Order (booking) found  □ Correlation ID  □ Support Trace status
```

## 1. Purpose

Investigate failed or missing diagnostic test orders (“bookings”): recommendation not leading to order, order create errors, price/labs issues before/at routing.

## 2. Severity

| Level | When |
|-------|------|
| **P1** | Order creation broken for all consultations |
| **P2** | Single patient order missing / stuck |
| **P3** | Order OK but Support Trace lag |
| **P4** | Catalog display only |

## 3. User may say

- “Tests recommended but booking failed.”
- “Order not created / no order number.”
- “Lab price not showing / cannot proceed.”
- “WhatsApp recommendation sent but no order.”

## 4. Information to collect

- Patient, doctor, clinic, date
- Consultation id, `order_number` if any, recommendation message screenshots

## 5. Escalation

| If | Escalate to |
|----|-------------|
| Order missing mid-journey after recommend | Developer |
| Pricing / catalog misconfiguration | Developer / Lab ops |
| Routing after order exists | [04](04_Routing_Runbook.md) |
| CloudWatch | DevOps — [10](10_CloudWatch_Runbook.md) |

## 6. Investigation flow

```text
Patient / consultation_id
  → SQL: diagnostics_engine_diagnosticorder by consultation_id
  → booking_id = order.id (UUID)
  → GET /api/v1/support/booking/{booking_id}?expand=timeline,summary,health,relationships
  → business_audit for booking/recommendation workflow_instance_id
  → If stuck after order: open 04 Routing
```

## 7. Expected Database State

```text
consultations_core_consultation
  → consultation_investigation_items (suggested tests)  [optional path]
  → diagnostics_marketplace_recommendation_api_audit (recommendation_id)  [optional]
  → diagnostics_engine_diagnosticorder (order_number; id = booking_id)
  → diagnostics_engine_diagnosticorderitem (+ test lines)
  → business_audit booking/recommendation events
  → support_trace.booking_id / order_id set
  → next: routingrun / lab assignment (04)
```

**Empty `diagnostics_engine_diagnosticorder` after doctor claims booking** = primary failure locus.

## 8. API flow

```text
GET /api/v1/support/consultation/{consultation_id}?expand=relationships
GET /api/v1/support/booking/{booking_id}?expand=timeline,summary,health,relationships
GET /api/v1/support/search?q={order_number}
GET /api/v1/support/recommendation/{recommendation_id}?expand=...
```

Shell (full chain):

```python
from support_trace.incident import IncidentReconstructionService, ReconstructionLevel
IncidentReconstructionService.reconstruct_booking("<booking_id>", level=ReconstructionLevel.FULL)
```

## 9. Expected Audit / Trace / Logs

```text
Clinical Audit: test.ordered / recommendation.sent (as wired)
Business Audit: recommendation.* → booking.created/confirmed → routing.* (later)
Support Trace:  Booking workflow; identifiers booking_id, consultation_id
CloudWatch:     See 10 — correlation_id
```

## 10. SQL (pointers)

[`11`](11_Common_SQL_Queries.md) — Booking / Order.

```sql
SELECT id, order_number, consultation_id, encounter_id, branch_id, status, created_at
FROM diagnostics_engine_diagnosticorder
WHERE consultation_id = '<consultation_id>'
ORDER BY created_at DESC;

SELECT workflow_instance_id, action, state_before, state_after, sequence_no, correlation_id
FROM business_audit
WHERE resource_id = '<booking_id>'
ORDER BY sequence_no;
```

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| Recommendation WA yes, order no | Order create never invoked / failed validation |
| Order without branch | Assignment incomplete — check routing |
| Support search by order_number fails | Detector may prefer UUID; use SQL → booking UUID |
| Duplicate orders | Idempotency / double submit |

## 12. Resolution

1. Confirm or recreate order only via supported product flows (no inventing rows unless eng directs).
2. If order exists and lab not assigned → [04](04_Routing_Runbook.md).
3. Retest Support booking lookup + timeline.
4. Attach `order.id` as booking_id and `order_number` on ticket.

## 13. What Success Looks Like

```text
Success Criteria
  □ DiagnosticOrder present with order_number
  □ Items/test lines present
  □ Support Trace booking_id = order UUID; status consistent
  □ Timeline shows recommendation/booking events
  □ Routing/report paths handed off if applicable
```
