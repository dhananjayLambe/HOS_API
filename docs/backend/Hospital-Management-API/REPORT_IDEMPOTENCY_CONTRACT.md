# Report API idempotency contract

## Header

```
Idempotency-Key: <uuid>
```

Optional on mutating report endpoints. Recommended on all finalize and delivery calls from the UI.

## Scopes

| Scope | Endpoint |
|-------|----------|
| `report.mark_ready` | `POST .../mark-ready/` |
| `report.send_whatsapp` | `POST .../send-whatsapp/` |

## Behavior

- Same `(scope, user, key)` + same request body hash → replay cached `200` response
- Same key + different body hash → `409` `IDEMPOTENCY_CONFLICT`
- TTL: 24 hours (`IDEMPOTENCY_KEY_TTL_HOURS`)

## Storage

`core.IdempotencyKey` — append-only success snapshots; nightly expiry cleanup on access.

## Celery

Delivery tasks use `delivery.{log_id}` idempotency via terminal log status checks (no duplicate send when already SENT/DELIVERED).
