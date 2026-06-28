# Milestone 3 — Marketplace Recommendation Platform API

**Status:** Complete  
**Depends on:** M2 (`LabRecommendationService`)  
**Endpoint:** `POST /api/v1/marketplace/diagnostics/recommendations/`

## Documents

| Doc | Purpose |
|-----|---------|
| [M3_API_Contract.md](./M3_API_Contract.md) | Request/response/error specification (source of truth) |
| [M3_API_Architecture.md](./M3_API_Architecture.md) | Layers, sequence diagrams, lifecycle |
| [M3_Serializer_Design.md](./M3_Serializer_Design.md) | Domain → JSON mapping |
| [M3_Security_and_Permissions.md](./M3_Security_and_Permissions.md) | Auth, access, audit |
| [M3_Audit_and_Observability.md](./M3_Audit_and_Observability.md) | Logs, metrics, audit model |
| [M3_Swagger_Guide.md](./M3_Swagger_Guide.md) | OpenAPI / drf-yasg |
| [M3_Postman_Collection.md](./M3_Postman_Collection.md) | Manual testing |
| [M3_Performance_Baseline.md](./M3_Performance_Baseline.md) | Latency and query budgets |
| [M3_Test_Strategy.md](./M3_Test_Strategy.md) | Test matrix including chaos |
| [M3_Acceptance_Checklist.md](./M3_Acceptance_Checklist.md) | Functional exit criteria |
| [M3_Production_Readiness_Checklist.md](./M3_Production_Readiness_Checklist.md) | Platform readiness |

## Code

| File | Role |
|------|------|
| `diagnostics_engine/api/views/marketplace_recommendation.py` | Thin view |
| `diagnostics_engine/api/serializers/marketplace_recommendation.py` | Envelope + enrichment |
| `diagnostics_engine/api/marketplace_urls.py` | URL mount |
| `diagnostics_engine/services/recommendation_access.py` | Consultation access |
| `diagnostics_engine/services/marketplace_recommendation_audit.py` | Audit + metrics hooks |
| `diagnostics_engine/models/marketplace_recommendation_audit.py` | Audit ORM |
| `diagnostics_engine/tests/test_marketplace_recommendation_api.py` | API + chaos tests |
