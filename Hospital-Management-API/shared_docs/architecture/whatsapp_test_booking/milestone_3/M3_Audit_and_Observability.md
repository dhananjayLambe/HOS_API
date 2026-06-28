# M3 — Audit and Observability

## Audit model

`MarketplaceRecommendationApiAudit` — one row per API call.

| Field | Purpose |
|-------|---------|
| `recommendation_id` | Client reference for M4 confirm |
| `request_id` | Correlation |
| `client_request_id` | Channel retry idempotency |
| `consultation_id` | Subject |
| `user_id` | Caller (UUID) |
| `user_role_snapshot` | Group names |
| `http_status`, `available`, `failure_reason` | Outcome |
| `duration_ms` | Latency |
| `ip_address`, `user_agent` | Support |

## Structured logs

| Event | Key fields |
|-------|------------|
| `recommendation.api.started` | request_id, consultation_id, user_id |
| `recommendation.api.completed` | + recommendation_id, branch_id, duration_ms |
| `recommendation.api.failed` | + failure_reason, http_status |
| `recommendation.api.metrics` | success rate inputs |

## Metrics catalog (dashboard-ready)

- Recommendation success %
- NO_ELIGIBLE_LABORATORY rate
- Latency avg / P95 / P99
- Query count (test baseline)
- Average quoted price
- Top recommended labs (from audit aggregation)
- Average distance / TAT

M3 emits via structured log hook; Datadog/Grafana wiring is optional follow-up.
