# API Contracts

Immutable contracts in `support_trace/api/contracts/`:

- `InvestigationRequest` — parsed API input
- `InvestigationResponse` — normalized payload
- `ApiEnvelope` — success/error wrapper
- `InvestigationMetadata` — includes `investigation_id`
- `PaginationMetadata`, `ErrorResponse`

Serializers in `serializers/v1/` map domain DTOs → contracts → JSON.

Enables future GraphQL/gRPC without changing controllers.
