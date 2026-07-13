# Report Delivery Audit (Use Case #1)

Report delivery is the first Communication Audit implementation.

## Service

`ReportCommunicationAuditService` — eight `emit_*` methods:

- `emit_report_ready`
- `emit_delivery_requested`
- `emit_whatsapp_delivery`
- `emit_email_delivery`
- `emit_sms_delivery`
- `emit_portal_delivery`
- `emit_delivery_failed`
- `emit_delivery_retried`

Channel-specific emits delegate to `_emit_channel_delivery()` internally.

## Record contract

- `workflow_type = ReportDelivery`
- `workflow_instance_id = communication_attempt_id` (attempt events) or `communication_id` (`report.ready`)
- `resource_type = Communication`, `resource_id = communication_id`
- `category = DELIVERY`
- `parent_workflow_instance_id = routing_id → booking_id → recommendation_id`

## Integrations

Production modules call `business_audit/communication/report/hooks.py` only:

| Stage | Hook |
|-------|------|
| `mark_ready()` | `schedule_report_ready` |
| `prepare_report_delivery()` | `schedule_delivery_requested` |
| `execute_delivery_send()` | `schedule_channel_delivery_success` |
| `mark_delivery_failed()` | `schedule_delivery_failed` |
| `retry_delivery()` | `schedule_delivery_retried` |
| Portal publish (stub) | `schedule_report_portal_communication` |
| Provider webhook (stub) | `schedule_communication_webhook_received` |

`LabReportDeliveryLog.metadata` stores `communication_id`, `communication_attempt_id`, `attempt_number`.

## Clinical boundary

Clinical audit (`schedule_report_shared`) is unchanged. Business communication audit complements clinical `report.shared`.

## Related

- [REPORT_DELIVERY_EVENTS.md](REPORT_DELIVERY_EVENTS.md)
- [REPORT_DELIVERY_WORKFLOW.md](REPORT_DELIVERY_WORKFLOW.md)
