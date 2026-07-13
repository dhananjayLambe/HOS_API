# Report Delivery Events

## Action catalog

| Action | Label | Wired |
|--------|-------|-------|
| `report.ready` | Report Ready | Yes |
| `report.delivery_requested` | Report Delivery Requested | Yes |
| `report.whatsapp_delivery` | Report WhatsApp Delivery | Yes |
| `report.email_delivery` | Report Email Delivery | Yes |
| `report.sms_delivery` | Report SMS Delivery | Yes |
| `report.portal_delivery` | Report Portal Delivery | Extension point |
| `report.delivery_failed` | Report Delivery Failed | Yes |
| `report.delivery_retried` | Report Delivery Retried | Yes |
| `communication.webhook_received` | Communication Webhook Received | Stub |

## Idempotency

| Event | Guard |
|-------|-------|
| `report.ready` | One per `communication_id` |
| `report.delivery_requested` | One per `communication_attempt_id` |
| `report.portal_delivery` | One per `communication_id` |
| `report.{channel}_delivery` | `provider_reference` = external message ID |
| `report.delivery_retried` | `parent_attempt_id + attempt_number` |
| `report.delivery_failed` | One per `communication_attempt_id` |
| `communication.webhook_received` | `provider_reference + webhook_event_type` |

Each retry creates a new `LabReportDeliveryLog` = new `communication_attempt_id`.
