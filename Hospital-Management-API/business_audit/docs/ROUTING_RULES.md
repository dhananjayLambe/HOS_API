# Routing Rules

## Eligibility rule codes

Mapped from `diagnostics_engine.services.routing.eligibility_engine`:

### Pass codes (ER_*)

| Code | Priority |
|------|----------|
| `in_service_area` | 100 |
| `has_service_pricing` | 90 |
| `branch_active` | 80 |
| `org_orderable` | 70 |
| `home_collection_supported` | 60 |
| `walk_in_supported` | 50 |

### Reject codes (IR_*)

| Code | Label |
|------|-------|
| `branch_inactive` | Branch inactive |
| `org_not_orderable` | Organization not orderable |
| `outside_service_area` | Outside service area |
| `missing_test_pricing` | Missing test pricing |
| `home_collection_not_supported` | No home collection |
| `walk_in_not_supported` | Walk-in not supported |
| `beyond_home_collection_radius` | Beyond home collection radius |

## Strategy

`DecisionStrategy.HYBRID` maps from diagnostics `RoutingStrategy` at payload build time.

## Rule version

`rule_version = {engine_version}.{weights_fingerprint}` where fingerprint encodes `DIAGNOSTICS_ROUTING_SCORING_WEIGHTS` (price, SLA, distance).

## Rule evaluation event

`routing.rule_evaluated` fires after `EligibilityEngine.evaluate_all` / `evaluate_requirements`, before `routing.lab_matched`.
