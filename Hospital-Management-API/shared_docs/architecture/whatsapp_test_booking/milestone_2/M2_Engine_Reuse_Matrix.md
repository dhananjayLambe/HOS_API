# M2 — Engine Reuse Matrix

Implementation contract for Milestone 2. No component may be duplicated outside this matrix.

| Component | Location | Reuse | Modification |
|---|---|---|---|
| Investigation load + validate | `order_creation._load_and_validate_convertible_items` | Extract → `investigation_resolution.py` | order_creation imports |
| Package composition | `order_creation._normalize_package_composition` | Extract → `investigation_resolution.py` | Public `normalize_package_composition` |
| Service ID extraction | `eligibility_engine.evaluate_all` dedupe | New `extract_required_service_ids` | Match unique service_id set |
| Collection mode | `order_creation._create_order_items` | Extract `derive_sample_collection_mode` | No DB |
| Location resolution | `routing_helpers.resolve_routing_location` | New `resolve_routing_location_for_context` | order path delegates |
| `PricingQuoteService` | `domain/pricing.py` | Reuse as-is | None |
| `EligibilityEngine.evaluate_requirements` | `eligibility_engine.py` | Reuse as-is | None |
| `RankingEngine.rank` | `ranking_engine.py` | Reuse as-is | None |
| `RoutingService` | `routing_service.py` | **Do not call** | Post-booking only |
| `AssignmentService` | `assignment_service.py` | **Do not call** | Persists DB |
| `DiagnosticOrderCreationService` | `order_creation.py` | Partial | Shared helpers only |
