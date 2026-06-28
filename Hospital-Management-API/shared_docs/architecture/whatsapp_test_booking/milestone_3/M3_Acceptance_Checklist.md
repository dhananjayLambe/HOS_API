# M3 — Acceptance Checklist

- [x] `POST /api/v1/marketplace/diagnostics/recommendations/` implemented
- [x] Thin adapter over `LabRecommendationService` — no duplicated business logic
- [x] Nested envelope: metadata, recommendation, tests, packages, error
- [x] `recommendation_id`, TTL, version metadata on every response
- [x] Dual pricing: `quoted_price` + `routing_estimated_price`
- [x] Collection flags, lab/branch metadata, labels, `why_recommended`
- [x] Failure `next_action` for channel UX
- [x] JWT + orchestration actor + consultation access
- [x] Rate limit 20/min
- [x] Audit row per API call
- [x] No `DiagnosticOrder` / `RoutingRun` writes
- [x] Swagger annotations on view
- [x] API tests + chaos scenarios green (25 tests with M2)
- [x] Contract and architecture docs in `milestone_3/`

**Sign-off:** Ready for M4 WhatsApp recommendation flow.
