# M2 — Recommendation Service Design

See implementation: `diagnostics_engine/domain/recommendation.py`

## Public API

```python
LabRecommendationService.recommend(
    consultation: Consultation,
    encounter: ClinicalEncounter | None = None,
    branch: LabBranch | None = None,
    patient_profile: PatientProfile | None = None,
    location_override: ResolvedRoutingLocation | None = None,
) -> RecommendationResult
```

## Orchestration

1. Validate consultation / encounter
2. `load_convertible_investigation_items`
3. `extract_required_service_ids`
4. `derive_sample_collection_mode(branch=None)` — matches default EMR order path
5. `resolve_routing_location_for_context`
6. `EligibilityEngine.evaluate_requirements`
7. `RankingEngine.rank` on eligible only
8. `PricingQuoteService` at winner branch for `quoted_price`

## DTO fields

- `routing_estimated_price` — parity with routing (`EligibilityCandidate.estimated_price`)
- `quoted_price` — patient display total from `PricingQuoteService`
- `pricing_source` — `service_sum` | `mixed_sku` | `derived`

## Excluded

- `RoutingService`, `AssignmentService`, order creation, Celery, WhatsApp
