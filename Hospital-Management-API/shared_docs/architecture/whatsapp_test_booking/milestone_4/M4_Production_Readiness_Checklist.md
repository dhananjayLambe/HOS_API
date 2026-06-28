---
owner: platform-team
module: whatsapp_test_booking
milestone: M4
status: pre_m5_gate
last_updated: 2026-06-28
---

# M4 Production Readiness Checklist (Pre–Milestone 5)

Gate for **diagnostic recommendation WhatsApp** (M4.3/4.4). Recommendation must remain **read-only** — no `DiagnosticOrder`, routing, payment, or lab assignment.

## 1. Recommendation accuracy

| Scenario | Automated test | Status |
|----------|----------------|--------|
| Single catalog test | `test_real_recommendation_matches_routing_engine` | ✅ |
| Multiple tests | `LabRecommendationService` parity tests (M2) | ✅ |
| Single package | M2 `test_lab_recommendation_service` | ✅ |
| Package + individual tests | M2 investigation resolution | ✅ |
| Home collection | `collection_mode` in metadata + routing | ✅ |
| Lab visit | default `collection_mode=lab` | ✅ |
| No eligible lab | `test_unavailable_recommendation_plain_text` | ✅ |
| Only custom investigations | `test_custom_investigations_only_skips_whatsapp` | ✅ |
| Mixed investigations | M2 + end-consultation catalog resolver | ✅ |
| Inactive test | M2 `test_no_eligible_lab_when_no_pricing` | ✅ |
| Deleted package | M2 routing debug / onboarding validator | ✅ |

**Expected:** Recommendation matches `LabRecommendationService` (in-process). No booking created.

## 2. WhatsApp sequencing

Order enforced by Celery chain:

```
Prescription summary (template) → [PDF link in template] → Recommendation
```

Recommendation task runs only from `send_prescription_whatsapp` when status is `SENT`.

| Check | Test |
|-------|------|
| Recommendation not queued on QUEUED prescription | `test_sequencing_recommendation_only_after_prescription_sent` |

## 3. Duplicate prevention

| Idempotency key | Scope |
|-----------------|-------|
| `prescription_{prescription_id}` | Summary |
| `diagnostic_recommendation_{consultation_id}` | Recommendation |

| Check | Test |
|-------|------|
| Second prepare returns None after SENT | `test_duplicate_end_consultation_one_recommendation` |

## 4. Recommendation expiry metadata

Stored in `WhatsAppMessage.request_payload.recommendation_metadata`:

- `recommendation_id`, `generated_at`, `expires_at`, `expires_in_seconds`
- `recommended_branch` (id, name, code)
- `quoted_price`, `collection_mode`, `mrp_total`, `savings`

TTL: `MARKETPLACE_RECOMMENDATION_TTL_SECONDS` (default 900).

## 5. Logging lifecycle

| Event | Where |
|-------|-------|
| `recommendation.started` | orchestrator |
| `recommendation.prepare` | orchestrator |
| `recommendation.generated` | orchestrator |
| `recommendation.available` / `recommendation.unavailable` | orchestrator |
| `recommendation.sent` | `whatsapp_service` |
| `recommendation.delivered` | webhook (TEST_BOOKING) |
| `recommendation.failed` / `recommendation.skipped` | orchestrator |
| `recommendation.duplicate_skipped` | `whatsapp_service` |

## 6. Audit (database)

`WhatsAppMessage` row (`message_type=TEST_BOOKING`) stores:

- `encounter_id`, `prescription_id` (optional)
- `consultation_id` in `request_payload`
- `meta_message_id`, `template_name`
- `recommendation_id` + timestamps in `recommendation_metadata`
- `queued_at`, `sent_at`, `delivered_at`, `status`

API: `GET /api/v1/notifications/whatsapp/recommendations/consultation/<id>/`

## 7. No booking verification

| Model | Created by M4? |
|-------|----------------|
| `DiagnosticOrder` | ❌ |
| `LabOrderAssignment` | ❌ |
| `RoutingRun` | ❌ |
| Payment | ❌ |

Test: `test_no_booking_side_effects`

## 8. Template validation

| Case | Coverage |
|------|----------|
| Long patient / test names | `test_long_test_names_sanitized_for_meta` |
| 15+ tests | truncated to Meta 1024 limit |
| Decimal / large prices | `format_whatsapp_price_amount` |
| Zero savings | flat `Price: ₹X` (no “You Save: ₹0”) |
| Discount | MRP + DoctorPro Price + savings |

**Zero-discount UX:** `pricing_display_mode=flat` — plain text send by default, or optional `WHATSAPP_DIAGNOSTIC_RECOMMENDATION_FLAT_TEMPLATE_NAME` for Meta template with Book button.

## 9. Failure scenarios

| Scenario | Behaviour |
|----------|-----------|
| Meta API down | Recommendation `FAILED`; prescription unaffected |
| Recommendation exception | Celery retry; prescription unaffected |
| No eligible lab | Plain-text Sorry |
| Consultation missing | Skip, log `recommendation.skipped` |
| Missing phone | `SKIPPED` row |

## 10. Performance targets

| Metric | Target | Test |
|--------|--------|------|
| Recommendation prepare | < 300 ms typical | logged `execution_time_ms` |
| End-to-end prepare | < 2 s (excl. Meta) | `test_recommendation_generation_performance_budget` |

## 11. Feature flag

```env
WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED=true   # set false to disable without deploy
```

Test: `test_feature_flag_disables_recommendation_chain`

## 12. Operations dashboard

`GET /api/v1/notifications/whatsapp/recommendations/metrics/?days=7`

Returns: generated, sent, delivered, failed, skipped, no eligible lab.  
`button_clicks` / `booking_conversions` → M5 placeholders.

Django Admin: filter `WhatsAppMessage` by `message_type=TEST_BOOKING`.

## Run tests

```bash
cd HOS_API/Hospital-Management-API
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python manage.py test \
  notifications.tests.test_diagnostic_recommendation_production_readiness \
  notifications.tests.test_diagnostic_recommendation_whatsapp \
  notifications.tests.test_whatsapp_template_renderer.RecommendationTemplateRendererTests \
  diagnostics_engine.tests.test_lab_recommendation_service
```

## Known gaps (M5 / M8)

- WhatsApp Flow button (`WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID`) — M5
- Recommendation retry API for `TEST_BOOKING` — M8
- Persisted recommendation session table — M5 handoff
- Flat-price Meta template approval for Book button when savings = 0
