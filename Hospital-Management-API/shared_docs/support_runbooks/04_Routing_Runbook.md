# 04 — Routing Runbook

Lab matching / assignment after a DiagnosticOrder exists. Stuck routing, wrong lab, failed decision.

Parent booking: [03_Diagnostic_Test_Booking_Runbook.md](03_Diagnostic_Test_Booking_Runbook.md).

Identifiers: [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) · Tables: [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md)

---

## 0. Quick Triage

```text
Quick Triage
  Estimated Time: ~5 min
  Inputs Needed: □ Patient Name  □ Mobile  □ order_number / booking_id  □ Date
  First Action: Resolve DiagnosticOrder UUID → Support booking lookup → check routingrun / lab_order_assignments
  Expected Output: □ RoutingRun found  □ Lab assigned or fail reason  □ Correlation ID  □ Support Trace status
```

## 1. Purpose

Diagnose routing failures: no eligible labs, decision not terminal, wrong branch assigned, assignment table empty after routing claimed complete.

## 2. Severity

| Level | When |
|-------|------|
| **P1** | All orders stuck without lab assignment |
| **P2** | Single booking wrong/missing lab |
| **P3** | Soft retry / eventual success |
| **P4** | Rank display only |

## 3. User may say

- “Order created but no lab assigned.”
- “Wrong lab / branch selected.”
- “Routing failed / stuck processing.”
- “Eligible labs empty.”

## 4. Information to collect

- `order_number` / booking UUID, patient mobile, clinic/area, expected lab

## 5. Escalation

| If | Escalate to |
|----|-------------|
| Empty eligible labs / catalog coverage | Developer / Lab ops |
| Decision snapshot missing terminal | Developer |
| DB errors | Backend |
| CloudWatch | DevOps — [10](10_CloudWatch_Runbook.md) |

## 6. Investigation flow

```text
booking_id (= DiagnosticOrder.id)
  → GET /api/v1/support/booking/{booking_id}?expand=timeline,summary,health,relationships
  → SQL: diagnostics_engine_routingrun → eligiblelabsnapshot → routingdecisionsnapshot
       → routinglaborderassignment / lab_order_assignments
  → business_audit: routing.started → routing.lab_assigned | routing.failed
  → CloudWatch: correlation_id (10)
```

## 7. Expected Database State

```text
diagnostics_engine_diagnosticorder
  → diagnostics_engine_routingrun
  → diagnostics_engine_eligiblelabsnapshot (≥1 when matchable)
  → diagnostics_engine_routingdecisionsnapshot (terminal decision)
  → diagnostics_engine_routinglaborderassignment
     AND/OR lab_order_assignments (diagnostic_order_id)
  → business_audit Routing events
  → support_trace.routing_id / booking_id updated
```

**Empty `routingrun`** → routing never started.  
**Run without assignment** → failed / incomplete decision.

## 8. API flow

```text
GET /api/v1/support/booking/{booking_id}?expand=timeline,summary,health,relationships
GET /api/v1/support/search?q={routing_id}
```

Use `RoutingDecisionCertificationService` in shell when certifying a known journey (dev only).

## 9. Expected Audit / Trace / Logs

```text
Business Audit: routing.started → lab_matched → lab_assigned (or failed / manual_override)
Support Trace:  current_state reflects Assigned or Failed; retry_count if retries
CloudWatch:     See 10
```

## 10. SQL (pointers)

[`11`](11_Common_SQL_Queries.md) — Routing.

```sql
SELECT id, diagnostic_order_id, status, created_at
FROM diagnostics_engine_routingrun
WHERE diagnostic_order_id = '<booking_id>'
ORDER BY created_at DESC;

SELECT id, lab_branch_id, diagnostic_order_id, created_at
FROM lab_order_assignments
WHERE diagnostic_order_id = '<booking_id>';
```

## 11. Common issues → possible reasons

| Symptom | Likely cause |
|---------|--------------|
| No eligible labs | Service area / pricing / catalog inactive |
| Multiple runs, no assign | Soft fail + retry; check terminal audit |
| Wrong lab | Rule/snapshot weights; manual override need |
| Support routing_id null | Identifier sync lag |

## 12. Resolution

1. Confirm order exists (03).
2. Inspect eligibility → decision → assignment chain.
3. Ops may re-trigger routing per product process only; otherwise escalate Developer.
4. Retest Support booking timeline / relationships.

## 13. What Success Looks Like

```text
Success Criteria
  □ RoutingRun exists for order
  □ Terminal decision present (assigned or documented fail)
  □ lab_order_assignments (or routing assignment) matches selected branch
  □ Business audit shows started + terminal
  □ Support Trace reflects assignment state
```
