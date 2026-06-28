# M3 — Serializer Design

Mapping from `RecommendationResult` → nested JSON. No raw ORM objects in response.

## Request

`MarketplaceRecommendationRequestSerializer`: `consultation_id`, optional `client_request_id`.

## Response builder

`MarketplaceRecommendationResponseBuilder.from_result()` produces `(payload, http_status)`.

| Domain | JSON path |
|--------|-----------|
| — | `metadata.recommendation_id` (generated UUID) |
| — | `metadata.request_id`, `client_request_id` |
| — | `metadata.recommendation_version`, `routing_version` |
| — | `metadata.expires_at`, `expires_in_seconds` |
| `result.available` | `recommendation.available` |
| `result.consultation_id` | `recommendation.consultation_id` |
| `result.collection_mode` | `recommendation.collection_mode` |
| branch/org flags | `home_collection_available`, `lab_visit_available` |
| — | `branch_address`, `branch_contact_number`, `branch_working_hours`, `google_maps_url` |
| — | `available_slot_dates` (`null` until slot booking milestone) |
| `recommended_lab` | `recommendation.lab` via `_serialize_lab()` |
| `recommended_branch` | `recommendation.branch` via `_serialize_branch()` (reloads address) |
| `quoted_price`, `routing_estimated_price` | string decimals |
| `ranking_labels` | `primary_label`, `secondary_labels`, `why_recommended` |
| `expanded_tests` | `tests[]` |
| `packages` | `packages[]` |
| `failure_reason` | `error.code`, `error.message`, `error.next_action` |

## Enrichment rules (presentation only)

- **Labels:** `recommended` is primary when present; else first label
- **Why recommended:** static map from label codes to human strings
- **Branch address:** `LabAddress.address_line_1` + optional line 2
- **Logo URL:** `LabOrganization.logo.url` or null

## Forbidden in serializers

- Direct `BranchServicePricing` queries
- Calls to `RoutingService` / order creation
- Ranking or eligibility logic
