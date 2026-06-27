---
owner: notifications-team
module: notifications
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Services — notifications

| Module | Role |
|---|---|
| `whatsapp_service.py` | Core send pipeline |
| `meta_client.py` | Meta Graph API HTTP |
| `prescription_whatsapp_orchestrator.py` | Rx-specific assembly |
| `whatsapp_template_renderer.py` | Template variable rendering |
| `phone_utils.py` | E.164 normalization (+91 default) |
| `prescription_whatsapp_audit.py` | Audit trail |
| `tasks.py` | Celery entry: async send |

## Simulated provider

When `WHATSAPP_USE_SIMULATED_PROVIDER=True` or no access token — logs without Meta call.

## Webhook

`WhatsAppWebhookAPIView` — updates `WhatsAppMessage` status timestamps.
