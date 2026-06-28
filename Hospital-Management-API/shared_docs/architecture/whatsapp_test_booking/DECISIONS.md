---
owner: platform-team
module: whatsapp_test_booking
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
document_type: adr
---

# Marketplace Architecture Decision Records

Architecture decisions for the DoctorProCare Diagnostics Marketplace (Phase 1).

**Note:** Engine-level pricing ADRs (package SKU, STRICT fulfillment) live in [diagnostics_engine/docs/DECISIONS.md](../../../diagnostics_engine/docs/DECISIONS.md).

**Gap and milestone mapping:** [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md)

---

## ADR-001: Single Laboratory Fulfilment

| Field | Value |
|---|---|
| Status | **Accepted** |
| Date | 2026-06-27 |
| Context | Phase 1 must deliver reliable complete-order fulfilment without marketplace splitting complexity. Multi-lab fulfilment requires settlement, partial reporting, and patient UX not ready for production. |
| Decision | Each diagnostic order is assigned to exactly **one laboratory** at any point in time. The laboratory must fulfil every investigation in the order (all package components expanded). Order splitting is prohibited in Phase 1. |
| Alternatives | (1) Multi-lab split at booking — rejected: out of scope, high commercial complexity. (2) Partial fulfilment — rejected: violates patient trust principle. |
| Consequences | **Positive:** Simple audit, single collection workflow, clear lab accountability. **Negative:** Lower fulfilment rate if no single lab covers full order; eligibility engine must filter strictly. |
| Migration Plan | N/A — greenfield marketplace layer on existing routing. |
| References | [doctor_pro_2.0.md](doctor_pro_2.0.md) R2, R3 · [DoctorProCare Diagnostics Marketplace.md](DoctorProCare%20Diagnostics%20Marketplace.md) Rule 2 |

---

## ADR-002: Two-Attempt Re-routing Strategy

| Field | Value |
|---|---|
| Status | **Accepted** (implementation pending M6) |
| Date | 2026-06-27 |
| Context | Laboratories may reject or timeout. Patients should not see operational complexity. Unlimited retries create ops burden and patient uncertainty. |
| Decision | Maximum **two routing attempts** per order. Attempt 1: highest-ranked eligible lab. On reject or timeout: permanently exclude that branch, re-run ranking, assign attempt 2. If attempt 2 fails: `ROUTING_FAILED`, notify patient, stop workflow (no payment, no appointment). Timeout treated identically to reject. |
| Alternatives | (1) Unlimited retries — rejected: ops cost, patient confusion. (2) Manual-only reroute — rejected: does not scale. (3) Zero retries — rejected: poor fulfilment rate. |
| Consequences | **Positive:** Bounded ops, clear failure mode, auditable two-step history. **Negative:** Requires branch exclusion list and second `RoutingRun` per order (GAP-007). |
| Migration Plan | Extend `RoutingService`; emit `LAB_REJECTED`, `REASSIGNED` events; hook lab `reject_assignment` and auto-reject to reroute orchestrator. |
| References | [doctor_pro_2.0.md](doctor_pro_2.0.md) R4 · [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md) · GAP-007 |

---

## ADR-003: Patient Price Guarantee

| Field | Value |
|---|---|
| Status | **Accepted** (full persistence pending Phase 3) |
| Date | 2026-06-27 |
| Context | Recommendation price is live. Patient must trust agreed price after booking. Laboratory reroute may change internal lab payout. |
| Decision | Price shown at recommendation is a **live quotation**. Upon patient booking confirmation, patient price becomes **immutable**. Laboratory reassignment must never change the patient’s agreed total. Commercial margin differences on reroute are absorbed internally and auditable. |
| Alternatives | (1) Reprice on reroute — rejected: violates patient trust. (2) No price at recommendation — rejected: poor conversion and transparency. |
| Consequences | **Positive:** Patient trust, clear commercial rules. **Negative:** Requires quote lock entity and internal margin tracking on reroute (GAP-010). Today: snapshots on `DiagnosticOrderItem` at order creation only. |
| Migration Plan | Phase 3: introduce recommendation quote record linked to consultation; copy to order snapshots at M5 confirm. |
| References | [doctor_pro_2.0.md](doctor_pro_2.0.md) R5 · [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) · GAP-010 |

---

## ADR-004: Future Multi-Laboratory Architecture

| Field | Value |
|---|---|
| Status | **Accepted** (future phase — not Phase 1) |
| Date | 2026-06-27 |
| Context | Long-term vision includes multi-lab fulfilment, split bookings, and settlement. Phase 1 models must not block this. |
| Decision | Phase 1 uses single `RoutingLabOrderAssignment` winner and single `LabOrderAssignment`. Future multi-lab will introduce **fulfilment groups** or **sub-orders per lab** without breaking existing audit tables. Routing history remains append-only per attempt. No Phase 1 schema change shall make per-lab settlement impossible. |
| Alternatives | (1) Build multi-lab now — rejected: scope. (2) Ignore future — rejected: would force redesign. |
| Consequences | **Positive:** Phase 1 ships fast; audit chain reusable. **Negative:** Some fields (e.g. single `branch_id` on order) may need denormalization or child entities in Phase 4. |
| Migration Plan | Phase 4 ADR required before implementation; extend order model or add `DiagnosticOrderFulfilmentGroup`. |
| References | [doctor_pro_2.0.md](doctor_pro_2.0.md) R10 · [09_Future_Roadmap.md](09_Future_Roadmap.md) |

---

## ADR-005: Recommendation Before Booking

| Field | Value |
|---|---|
| Status | **Accepted** (implementation pending M2–M5) |
| Date | 2026-06-27 |
| Context | Current code creates `DiagnosticOrder` at consultation end before patient sees lab offer. Production spec requires feasibility verification first. |
| Decision | Introduce read-only **`LabRecommendationService`** (M2) called by all channels before `DiagnosticOrderCreationService`. If zero eligible labs: stop workflow — no booking, no payment, no assignment. Booking (M5) only after patient confirms recommendation. |
| Alternatives | (1) Keep post-order routing only — rejected: violates R1. (2) Duplicate eligibility in WhatsApp — rejected: violates single source of truth. |
| Consequences | **Positive:** Aligns with production rules; reuses `EligibilityEngine` + `RankingEngine`. **Negative:** New service + API + WhatsApp flow required. |
| Migration Plan | M2 service → M3 API → M4 WhatsApp → M5 gate on order creation. |
| References | [11_Channel_Architecture.md](11_Channel_Architecture.md) · GAP-001, GAP-005 · [03_Recommendation_Engine.md](03_Recommendation_Engine.md) |

---

## ADR-006: Extend WhatsApp Pipeline (Do Not Redesign)

| Field | Value |
|---|---|
| Status | **Accepted** |
| Date | 2026-06-27 |
| Context | `notifications` WhatsApp prescription pipeline is production-proven (Celery, Meta client, audit model). Marketplace booking must use same stack. |
| Decision | All patient WhatsApp messages (recommendation, booking confirm, routing failure, reports) must flow through **`notifications.WhatsAppService`** and **`WhatsAppMessage`** audit. Extend with new templates and `TEST_BOOKING` orchestrator. Migrate report delivery from `SimulatedWhatsAppProvider` in M7. |
| Alternatives | (1) New WhatsApp module in diagnostics_engine — rejected: duplicate token management and audit. (2) Third-party bot platform — rejected: ops complexity. |
| Consequences | **Positive:** Reuse `PrescriptionSummaryBuilder`, webhooks, retry. **Negative:** Cross-app dependency from diagnostics_engine triggers to notifications tasks. |
| Migration Plan | M4: new templates + Celery tasks. M7: deprecate simulated report provider. |
| References | [10_WhatsApp_Integration.md](10_WhatsApp_Integration.md) · GAP-004, GAP-009 |

---

## ADR Index

| ID | Title | Status |
|---|---|---|
| ADR-001 | Single Laboratory Fulfilment | Accepted |
| ADR-002 | Two-Attempt Re-routing Strategy | Accepted (M6) |
| ADR-003 | Patient Price Guarantee | Accepted (Phase 3) |
| ADR-004 | Future Multi-Laboratory Architecture | Accepted (Future) |
| ADR-005 | Recommendation Before Booking | Accepted (M2–M5) |
| ADR-006 | Extend WhatsApp Pipeline | Accepted |
