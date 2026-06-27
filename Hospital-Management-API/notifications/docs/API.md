---
owner: notifications-team
module: notifications
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# API Reference — notifications

## Base paths

| Prefix | Purpose |
|---|---|
| `/api/notifications/` | Preferences (if mounted) |
| `/api/v1/notifications/` | WhatsApp delivery, webhook, retry |

## WhatsApp delivery API (`/api/v1/notifications/`)

| Route | Purpose |
|---|---|
| `whatsapp/webhook/` | Meta delivery/read callbacks |
| `whatsapp/status/consultation/<id>/` | Delivery status for consultation |
| `whatsapp/retry/<message_id>/` | Retry failed message |
| `whatsapp/resend/<prescription_id>/` | Resend prescription |
| `whatsapp/resend/consultation/<id>/` | Resend by consultation |

## Models

`WhatsAppMessage` — statuses: QUEUED → SENT → DELIVERED → READ (or FAILED/SKIPPED).

## Side effects

Append-only delivery logs (INV-004). Simulated provider when `WHATSAPP_USE_SIMULATED_PROVIDER=True`.

## Errors

`WHATSAPP_DELIVERY_FAILED` — [ERRORS.md](../../shared_docs/ERRORS.md)

<!-- auto-generated:api:start -->
## Endpoint index (auto-generated from urls.py)

_No routes found under api/urls.py_

<!-- auto-generated:api:end -->
