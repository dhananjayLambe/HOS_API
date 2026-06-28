# M2 — Acceptance Checklist

- [x] Engine Reuse Matrix documented (`M2_Engine_Reuse_Matrix.md`)
- [x] Shared helpers extracted (`investigation_resolution.py`)
- [x] `LabRecommendationService` implemented (read-only)
- [x] `RecommendationResult` DTO with dual pricing fields
- [x] Structured logging (`recommendation.started|completed|failed`)
- [x] Unit + parity tests (`test_lab_recommendation_service.py`)
- [x] No `RoutingService` / `AssignmentService` calls in recommendation path
- [x] `order_creation.py` refactored to shared helpers (no behavior change intended)
- [ ] Parity tests executed in CI/local venv
- [ ] Regression: `test_order_creation_service` + `test_routing_e2e` green
- [ ] Product/engineering sign-off

## Code entry points

| Symbol | Path |
|---|---|
| `LabRecommendationService` | `diagnostics_engine/domain/recommendation.py` |
| Shared investigation helpers | `diagnostics_engine/domain/investigation_resolution.py` |
| Location without order | `diagnostics_engine/services/routing/routing_helpers.py` → `resolve_routing_location_for_context` |

## Next milestone

M3 — Recommendation REST API (`POST /api/diagnostics/recommendations/`)
