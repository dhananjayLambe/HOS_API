---
owner: platform-team
module: whatsapp_test_booking
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
milestone: M1
document_type: current_state_analysis
---

# 01 — Business Principles

## Purpose

Map the approved Phase 1 business principles to **what the codebase implements today** and where gaps exist.

**Requirements reference:** [doctor_pro_2.0.md](doctor_pro_2.0.md), [DoctorProCare Diagnostics Marketplace.md](DoctorProCare%20Diagnostics%20Marketplace.md)

---

## Scope

- Current implementation alignment with each principle
- Cross-module ownership rules enforced in code
- Out of scope: future implementation design (see [M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md))

---

## Approved Phase 1 Principles

| # | Principle | Requirement source |
|---|---|---|
| 1 | Never accept an order that cannot be fulfilled | doctor_pro_2.0 §4, Marketplace §3 |
| 2 | Patient trust over booking volume | doctor_pro_2.0 §4 |
| 3 | Booking only after fulfilment feasibility confirmed | doctor_pro_2.0 §6 R1, Marketplace §5 |
| 4 | Every routing decision must be explainable | doctor_pro_2.0 §4, Marketplace §3 |
| 5 | No routing history may be lost | doctor_pro_2.0 §6 R7–R8, Marketplace §9–10 |
| 6 | Internal complexity invisible to patients | doctor_pro_2.0 §6 R6 |
| 7 | Architecture supports future expansion without redesign | doctor_pro_2.0 §6 R10 |

---

## Current Implementation Alignment

### Principle 1 — Never accept an unfulfillable order

**Partially implemented.**

| Mechanism | Location | What it does today |
|---|---|---|
| Eligibility filtering | `diagnostics_engine/services/routing/eligibility_engine.py` | Rejects branches missing pricing, outside service area, unsupported collection mode |
| STRICT package fulfillment | `diagnostics_engine/domain/fulfillment.py` | Requires all package services priced at branch |
| Custom investigation block | `diagnostics_engine/domain/order_creation.py` | Custom items cannot convert to lab orders |
| Routing no-match | `diagnostics_engine/services/routing/assignment_service.py` | Sets `routing_status=NO_MATCH_FOUND` when zero eligible labs |

**Gap:** Booking (`DiagnosticOrderCreationService`) runs **before** recommendation is shown to the patient. Eligibility is evaluated only after order persistence and routing trigger—not as a pre-booking gate.

### Principle 2 — Patient trust over volume

**Partially implemented.**

- WhatsApp prescription delivery is idempotent with skip/fail audit (`notifications/services/delivery/whatsapp_service.py`).
- Auto-reject stale lab assignments after SLA (`labs/services/workflow_transitions.py`, default 60 min).
- No patient-facing routing failure notification exists today for marketplace flows.

### Principle 3 — Recommendation before booking

**Not implemented as specified.**

Current flow: consultation end → `DiagnosticOrderCreationService.create_order_from_consultation()` → routing on commit.

There is no read-only recommendation step before order creation. See [03_Recommendation_Engine.md](03_Recommendation_Engine.md).

### Principle 4 — Explainable routing decisions

**Implemented for post-order routing.**

- `RoutingDecisionSnapshot` stores dimension scores (distance, price, TAT, quality, partner) and recommendation labels.
- `RoutingEvent` append-only audit trail per run.
- Quality and partner scores are flat 0.5 placeholders—not sourced from lab data.

### Principle 5 — Immutable routing history

**Implemented for first routing attempt.**

- `RoutingRun`, `EligibleLabSnapshot`, `RoutingDecisionSnapshot`, `RoutingEvent` models in `diagnostics_engine/models/routing.py`.
- Re-routing (second attempt) is **not implemented**—no second `RoutingRun` chain on reject/timeout.

### Principle 6 — Internal complexity invisible to patients

**Partially implemented.**

- Prescription WhatsApp shows medicine/test summary only—no routing internals.
- No marketplace booking WhatsApp flow exists yet.
- Report delivery WhatsApp is simulated, not production Meta.

### Principle 7 — Future-compatible architecture

**Strong foundation.**

- Separation: clinical (`consultations_core`) → commerce (`diagnostics_engine`) → fulfilment (`labs`) → notifications.
- Routing snapshots and pricing snapshots designed for audit replay.
- `evaluate_requirements()` on `EligibilityEngine` supports hypothetical orders without persistence.

---

## Cross-Module Ownership (Enforced in Code)

| Rule | Enforcement |
|---|---|
| Clinical intent owned by `consultations_core` | `InvestigationItem`, `ConsultationInvestigations` |
| Commercial orders owned by `diagnostics_engine` | `DiagnosticOrder`, routing models |
| Branch pricing owned by `labs` | `BranchServicePricing`, `BranchPackagePricing` |
| Lab operations owned by `labs` | `LabOrderAssignment`, collection, visit |
| WhatsApp delivery owned by `notifications` | `WhatsAppMessage` append-only audit |

Cross-app access is via ForeignKey or domain service calls—no duplicated master tables. See [shared_docs/ownership.md](../../ownership.md).

---

## Single Source of Truth Rules (Current)

| Domain | Single source | Must not duplicate in channels |
|---|---|---|
| Pricing | `PricingQuoteService` (`diagnostics_engine/domain/pricing.py`) | WhatsApp, admin, API |
| Lab eligibility + ranking | `EligibilityEngine` + `RankingEngine` | Any recommendation UI |
| Order creation | `DiagnosticOrderCreationService` | End-consultation, REST API |
| Lab assignment ops | `labs/services/workflow_transitions.py` | Lab dashboard only |
| Prescription WhatsApp | `WhatsAppService` + `PrescriptionSummaryBuilder` | Other channels for same content |

See [11_Channel_Architecture.md](11_Channel_Architecture.md) for the golden channel diagram.

---

## Marketplace Impact

Principles 3, 5, and 6 have the largest gaps relative to Phase 1 requirements. The codebase has strong post-booking routing audit but lacks pre-booking recommendation and multi-attempt rerouting.

---

## Milestone 2

Principle 3 (recommendation before booking) is the primary driver for Milestone 2 (`LabRecommendationService`). See gap analysis for full milestone mapping.

---

## Reusable Components

| Component | Module | Reuse for principles |
|---|---|---|
| `EligibilityEngine.evaluate_requirements()` | diagnostics_engine | Principle 1, 3 — pre-booking feasibility |
| `RankingEngine.rank()` | diagnostics_engine | Principle 3, 4 |
| `RoutingDecisionSnapshot` model | diagnostics_engine | Principle 4, 5 |
| `DiagnosticOrderCreationService` | diagnostics_engine | Principle 1 — after recommendation gate added |
| `WhatsAppService` | notifications | Principle 6 — patient communication |

---

## Known Gaps

| Principle | Gap |
|---|---|
| 3 | No pre-booking recommendation; order created before patient sees lab offer |
| 5 | Single routing attempt; no reroute history chain |
| 6 | No patient notification for routing failure or recommendation available |
| 1 | Booking not blocked when zero eligible labs exist at recommendation time |

---

## Reference

All gaps, milestones, dependencies, and priority: **[M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md)**

Requirements: [doctor_pro_2.0.md](doctor_pro_2.0.md) · [DoctorProCare Diagnostics Marketplace.md](DoctorProCare%20Diagnostics%20Marketplace.md)
