---
owner: platform-team
module: shared_docs
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: draft
---

# WhatsApp Meta Integration

Prescription and report delivery via Meta Cloud API.

## Settings

`WHATSAPP_*` env vars — see [CONFIGURATION.md](../CONFIGURATION.md).

## Simulated provider

`WHATSAPP_USE_SIMULATED_PROVIDER=true` or missing token — dev/test without Meta.

## Webhook

Verify token: `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Delivery callbacks append to delivery log.

## Templates

Prescription: `WHATSAPP_PRESCRIPTION_TEMPLATE_NAME` (default `consultant_utlity`).
