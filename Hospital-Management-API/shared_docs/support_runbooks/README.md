# DoctorProCare Production Support Runbooks

Support homepage for live incidents. Workflow-oriented, ops-focused. Prefer **Quick Triage** (~5 min) then expected DB state → Support API → SQL → CloudWatch.

```text
Complaint
  → Workflow
  → Runbook
  → Expected Tables (_foundation + playbook §7)
  → Support API (/api/v1/support/...)
  → SQL (11_Common_SQL_Queries.md)
  → CloudWatch (10_CloudWatch_Runbook.md)
```

---

## Quick map — “They said…” → open

| Says | Open |
|------|------|
| Reconstruct anything from name/phone | **[08 Patient Journey](08_Patient_Journey_Runbook.md)** |
| Consultation / Dx / symptoms / stuck visit | **[01 Consultation](01_Consultation_Runbook.md)** |
| Prescription / PNR / generate | **[02 Prescription](02_Prescription_Runbook.md)** |
| Test booking / order failed | **[03 Diagnostic Test Booking](03_Diagnostic_Test_Booking_Runbook.md)** |
| Lab not assigned / routing stuck | **[04 Routing](04_Routing_Runbook.md)** |
| Report not uploaded / PDF missing | **[05 Report Upload](05_Report_Upload_Runbook.md)** |
| Booked, no report received | **[06 Report Delivery](06_Report_Delivery_Runbook.md)** |
| WhatsApp not delivered | **[07 WhatsApp Delivery](07_WhatsApp_Delivery_Runbook.md)** |
| Payment / fee / invoice | **[09 Payment](09_Payment_Runbook.md)** (MVP stub) |
| Doctor login / clinic / KYC | **[13 Admin Operations](13_Admin_Operations_Runbook.md)** |
| Platform down | **[12 Emergency](12_Emergency_Runbook.md)** |

---

## Folder layout

| Path | Role |
|------|------|
| [`_TEMPLATE.md`](_TEMPLATE.md) | Section contract for every workflow playbook |
| [`_foundation/00_IDENTIFIERS.md`](_foundation/00_IDENTIFIERS.md) | Name/mobile/doctor/date → IDs |
| [`_foundation/01_TABLE_MAP.md`](_foundation/01_TABLE_MAP.md) | Real `db_table` names only |
| `01`–`09`, `13` | Workflow / admin playbooks |
| [`10_CloudWatch_Runbook.md`](10_CloudWatch_Runbook.md) | **Only** place for CloudWatch recipes |
| [`11_Common_SQL_Queries.md`](11_Common_SQL_Queries.md) | Paste-ready SQL by module |
| [`12_Emergency_Runbook.md`](12_Emergency_Runbook.md) | Infra emergencies |

---

## Anti-duplication rules

1. **Tables / identifiers** — defined only under `_foundation/`. Playbooks list names and link; they do not redefine schemas.
2. **CloudWatch** — every playbook says *See `10_CloudWatch_Runbook.md`* (+ which IDs). Do not copy Insights SQL into workflow files.
3. **Heavy SQL** — lives in `11_`. Playbooks keep 1–2 critical queries or query IDs (`P-01`, `B-03`, …).

---

## Naming anchors

- **Booking** = `diagnostics_engine_diagnosticorder`. Support Trace `booking_id` = order **UUID**, not `order_number`.
- **Mobile** = usually `account_user.username` (+ `whatsapp_messages.recipient_mobile_number`).
- **Patient name** → Patient APIs first (`/api/patients/search/`), then Support APIs.
- **Support APIs** = `/api/v1/support/` (JWT groups: admin, helpdesk, helpdesk_admin, operations, superadmin).
- **Incident reconstruction** = Django shell / `IncidentReconstructionService` — **no REST yet**.
- **Payment** = no Payment table in MVP — see [09](09_Payment_Runbook.md).

---

## Standard playbook sections

Every `01`–`09` + `13` follows [`_TEMPLATE.md`](_TEMPLATE.md):

0. Quick Triage → 1 Purpose → 2 Severity → 3 User may say → 4 Collect → 5 Escalation → 6 Flow → 7 Expected DB → 8 APIs → 9 Audit/Trace/Logs → 10 SQL → 11 Common issues → 12 Resolution → 13 Success Criteria

Severity: **P1** system-wide · **P2** single patient · **P3** minor · **P4** cosmetic.

---

## Real-time starter (name known)

1. `GET /api/patients/search/?query={name}` → `patient_account_id`, `mobile`, profile `id`
2. `GET /api/patients/{profile_id}/summary/` → `consultation_id`
3. `GET /api/v1/support/consultation/{consultation_id}?expand=timeline,summary,health,relationships`
4. If diagnostics: `booking_id` = DiagnosticOrder UUID → `GET /api/v1/support/booking/{booking_id}?expand=...`
5. Logs: [`10_CloudWatch_Runbook.md`](10_CloudWatch_Runbook.md) with `correlation_id` from Support / audit

Full path: [08 Patient Journey](08_Patient_Journey_Runbook.md).

**Practice:** [TESTING.md](TESTING.md) — run SQL via `dbshell`, then verify the same IDs with Support APIs (pass/fail checklist).

---

## Future API alignment

Each runbook step should eventually map 1:1 to `/api/v1/support/...` (and remaining gaps filled). Playbooks are the ops contract today; APIs close the gaps later. Do not block ops on missing UI.

---

## Success criteria (runbooks MVP)

- Open one playbook; Quick Triage in &lt;5 minutes yields IDs + next step.
- Severity + Escalation decide ticket owner.
- Empty link in **Expected Database State** = failure locus.
- CloudWatch instructions never diverge across files.
- Admin issues stay in **13**, not Consultation.
- Real schema only — booking ≠ fictional table.
