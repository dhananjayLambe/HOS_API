---
owner: notifications-team
module: notifications
version: 1.0
last_updated: 2026-06-27
reviewed_by: —
status: approved
---

# Validations — notifications

| Validation | Reason |
|---|---|
| Phone E.164 format | Meta API requirement |
| Template name approved in Meta | Template must exist |
| Body param keys match template | `WHATSAPP_TEMPLATE_BODY_PARAM_KEYS` |
| Retry only on FAILED parent log | Append-only retry policy |
| Webhook verify token | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |

## Message types

`WhatsAppMessageType`: PRESCRIPTION, REPORT, TEST_BOOKING, FOLLOWUP, APPOINTMENT, OTP.

## Terminal statuses

DELIVERED, READ, FAILED, SKIPPED — no further transitions except audit.
