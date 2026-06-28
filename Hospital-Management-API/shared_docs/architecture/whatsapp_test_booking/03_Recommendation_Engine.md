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

# 03 — Recommendation Engine

## Purpose

Document all components that perform recommendation or ranking logic today, and identify what is **missing** for pre-booking laboratory recommendation.

**There is no unified `LabRecommendationService` in the codebase.**

---

## Scope

- Clinical test suggestions (doctor-facing)
- Post-order lab ranking (marketplace routing)
- Hypothetical eligibility (debug/read-only)
- Home collection inputs to recommendation
- Out of scope: Milestone 2 service design (see gap analysis)

---

## Three Separate "Recommendation" Systems

| System | Audience | When | Location | Persists? |
|---|---|---|---|---|
| `InvestigationSuggestionEngine` | Doctor | During consultation | `diagnostics_engine/services/investigation_suggestions/` | Cache only |
| `EligibilityEngine` + `RankingEngine` | Platform | After order created | `diagnostics_engine/services/routing/` | Full audit |
| `LabRoutingScenarioDebugger` | Ops/debug | CLI / onboarding | `diagnostics_engine/services/routing/routing_debug.py` | No |

These must not be conflated. Only the routing engines perform **laboratory** recommendation.

---

## 1. InvestigationSuggestionEngine (Clinical — Not Lab Marketplace)

**Purpose:** Suggest tests and packages for a doctor to add during an encounter.

**Entry:** `GET /api/diagnostics/investigations/suggestions/`

**Pipeline:**

```
ContextBuilder.build(encounter)
  → CandidateGenerator
  → RuleEngine (DiagnosisTestMapping, SymptomTestMapping)
  → Ranker (clinical + doctor usage + global usage + recency)
  → PostProcessor (diversity limits)
  → ResponseBuilder
```

**Output buckets:** `common_tests`, `recommended_tests`, `recommended_packages`, `popular_packages`

**Not reusable for lab marketplace** — ranks catalog items, not laboratories.

---

## 2. Post-Order Lab Ranking (Production Routing)

**Orchestrator:** `RoutingService.start_routing_for_order()`  
**File:** `diagnostics_engine/services/routing/routing_service.py`

**Pipeline:**

```
RoutingRun created
  → resolve_routing_location(order)
  → EligibilityEngine.evaluate_all(order, location)
  → filter eligible candidates
  → RankingEngine.rank(eligible)
  → AssignmentService.persist_routing_result(ranked)
  → top rank #1 → RoutingLabOrderAssignment + order.branch_id
```

**Requires:** persisted `DiagnosticOrder` + `DiagnosticOrderTestLine` rows.

See [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md).

---

## 3. Hypothetical Eligibility (Pre-Order Hook Point)

**Method:** `EligibilityEngine.evaluate_requirements()`

**File:** `diagnostics_engine/services/routing/eligibility_engine.py`

```python
evaluate_requirements(
    *,
    service_ids: list,
    location: ResolvedRoutingLocation,
    mode: str,  # "home" | "lab"
    branches: Any | None = None,
) -> list[EligibilityCandidate]
```

- Same branch rules as production `_evaluate_branch`
- **No ORM writes** — no `DiagnosticOrder` required
- Used by `debug_lab_routing` management command and `LabRoutingScenarioDebugger`
- Docstring notes: "future routing introspection APIs"

**This is the primary reuse point for Milestone 2.**

---

## EligibilityCandidate Output (Per Branch)

| Field | Source |
|---|---|
| `estimated_price` | Sum of `BranchServicePricing.selling_price` for required services |
| `estimated_tat_hours` | Max `report_delivery_hours` across pricings |
| `distance_km` | Haversine if patient + branch coords available |
| `ineligibility_reasons` | Machine codes e.g. `missing_test_pricing`, `outside_service_area` |

---

## RankedLab Output (After RankingEngine)

| Field | Source |
|---|---|
| `distance_score`, `price_score`, `tat_score`, `quality_score`, `partner_score` | Min-max normalized 0–1 |
| `final_score` | Weighted sum |
| `recommendation_labels` | `CHEAPEST`, `FASTEST`, `NEAREST`, `RECOMMENDED`, `BEST_VALUE` |

**Default weights:** distance 0.35, price 0.35, TAT 0.25, quality 0.025, partner 0.025  
Override: `DIAGNOSTICS_ROUTING_SCORING_WEIGHTS` setting.

**Quality/partner:** default flat 0.5 for all candidates — not from lab performance data.

---

## Home Collection in Recommendation Context

Collection mode is an **input** to eligibility, not an output of ranking today.

| Mode | Eligibility checks |
|---|---|
| `home` | Branch + org `home_collection_available`, service area, radius, all services priced |
| `lab` | `walk_in_collection_available` |

**Booking-time home eligibility** (which mode to request) comes from `DiagnosticOrderCreationService` — see [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md).

**Gap:** Routing eligibility does not re-check per-service `home_collection_supported` on pricing rows.

---

## Package Expansion Before Eligibility

For marketplace recommendation, packages must expand to constituent `service_id` list before `evaluate_requirements()`.

**Reuse:**

- `build_package_expansion_snapshot()` — clinical snapshot
- `_normalize_package_composition()` — commercial normalization

Source: [04_Booking_Lifecycle.md](04_Booking_Lifecycle.md)

---

## Read API (Post-Order Only)

`GET /api/diagnostics/orders/<uuid>/routing/` — returns routing summary for persisted order.

No public API for pre-order recommendation.

---

## Debug Tooling

| Tool | Purpose |
|---|---|
| `python manage.py debug_lab_routing` | Scenario-based eligibility debug |
| `LabRoutingScenarioDebugger` | Structured report for onboarding validation |
| `LabOnboardingValidator` | Reuses production eligibility rules |

---

## Marketplace Impact

All ranking intelligence exists but is **coupled to order persistence**. Milestone 2 extracts the same engines into a read-only path.

---

## Milestone 2

Build `LabRecommendationService` composing existing components — no new ranking algorithm. Exit criterion from roadmap: same result as `RoutingEngine` for equivalent inputs.

---

## Reusable Components

| Component | Path | Role in future recommendation |
|---|---|---|
| `EligibilityEngine.evaluate_requirements` | `eligibility_engine.py` | Feasibility filter |
| `RankingEngine.rank` | `ranking_engine.py` | Score and label branches |
| `ScoringWeights` / `ScoringFunctions` | `scoring_weights.py`, `scoring_functions.py` | Scoring config |
| `PricingQuoteService` | `domain/pricing.py` | Authoritative line totals |
| `_normalize_package_composition` | `domain/package_orders.py` | Package → services |
| `resolve_routing_location` / pincode helpers | `routing_helpers.py` | Location resolution |
| `routable_lab_branches_queryset` | `routing_helpers.py` | Marketplace branch pool |

---

## Known Gaps

| Gap | Detail |
|---|---|
| No `LabRecommendationService` | Missing unified entry point |
| No pre-order API | Recommendation only after order |
| InvestigationSuggestionEngine | Wrong domain — clinical not lab |
| Quality/partner scores | Placeholder 0.5 |
| Collection mode output | Not computed as recommendation DTO field today |
| Single winner only | Rank #1 auto-assigned; no "show top 1" without assignment |

---

## Reference

**[M1_Marketplace_Gap_Analysis.md](M1_Marketplace_Gap_Analysis.md)**

Related: [05_Routing_and_Rerouting.md](05_Routing_and_Rerouting.md) · [07_Commercial_and_Pricing.md](07_Commercial_and_Pricing.md) · [11_Channel_Architecture.md](11_Channel_Architecture.md)
