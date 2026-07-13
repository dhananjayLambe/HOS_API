# Recommendation Business Audit

Operational audit trail for the recommendation pipeline (M4.2).

## Scope

Captures **how** recommendations are generated, marketplace-processed, and delivered — separate from Clinical Audit (`recommendation.generated` / `recommendation.sent` in `ClinicalAudit`).

All production writes go through:

```
RecommendationAuditService → BusinessAuditService.record() → business_audit table
```

## Package

```
business_audit/recommendation/
├── recommendation_audit_service.py   # Public facade
├── payload_builder.py
├── snapshot_builder.py
├── repository.py
├── hooks.py                            # schedule_* integration hooks
├── constants.py
└── types.py
```

## Public API

| Method | When |
|--------|------|
| `emit_generated()` | After `LabRecommendationService.recommend()` |
| `emit_queued()` | After WhatsApp message queued |
| `emit_sent()` | Meta accepts outbound message |
| `emit_delivered()` | Webhook delivery confirmation |
| `emit_read()` | Webhook read confirmation |
| `emit_failed()` | Send or webhook failure |
| `emit_retried()` | Celery or in-service retry |
| `emit_expired()` | TTL expiration job |

## Integration map

| Source | Hook |
|--------|------|
| `MarketplaceRecommendationView` | `schedule_recommendation_business_generated` |
| `diagnostic_recommendation_whatsapp_orchestrator` | `schedule_recommendation_business_generated` |
| `WhatsAppService.prepare_recommendation_delivery` | `schedule_recommendation_business_queued` |
| `WhatsAppService.send_recommendation_message` | `schedule_recommendation_business_sent` |
| `WhatsAppService._mark_recommendation_failed` | `schedule_recommendation_business_failed` |
| `WhatsAppWebhookAPIView` (TEST_BOOKING) | delivered / read / failed hooks |
| `notifications.tasks` retry paths | `schedule_recommendation_business_retried` |
| `expire_stale_recommendations` Celery beat | `schedule_recommendation_business_expired` |

## vs Clinical Audit

| Question | Clinical Audit | Business Audit |
|----------|----------------|----------------|
| What clinical care happened? | Yes | No |
| Which marketplace/package was selected? | Partial | Yes (full payload) |
| Did Meta accept/deliver/read? | No | Yes |
| Retry/expiration operational detail? | No | Yes |

Clinical hooks are **not removed** — both frameworks run in parallel sharing `correlation_id`.

## Workflow identity

- `workflow_instance_id` = `recommendation_id` (UUID)
- All lifecycle events and retries share the same instance ID
- `sequence_no` orders events within the instance

See [RECOMMENDATION_WORKFLOW.md](RECOMMENDATION_WORKFLOW.md) and [RECOMMENDATION_EVENTS.md](RECOMMENDATION_EVENTS.md).
