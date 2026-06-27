---
owner: notifications-team
module: notifications
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Events — notifications

## Consumes

| Event | Source | Action |
|---|---|---|
| Prescription WhatsApp send | consultations_core | Celery → Meta API |
| Report delivery | diagnostics_engine | Celery → Meta API |

## Publishes

| Event | Description |
|---|---|
| WHATSAPP_DELIVERY_CALLBACK | Webhook updates append-only log |

See [event_registry.md](../../shared_docs/event_registry.md).

## Invariant

INV-004 — delivery records never deleted.
