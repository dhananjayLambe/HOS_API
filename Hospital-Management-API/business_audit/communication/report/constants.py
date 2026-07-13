"""Report delivery communication audit constants."""

DOMAIN_DIAGNOSTICS = "diagnostics_engine"
SERVICE_REPORT_WORKFLOW = "ReportWorkflowService"
SERVICE_REPORT_DELIVERY = "ReportDeliveryService"
SERVICE_DELIVERY_TASK = "deliver_report_whatsapp"

OPERATION_MARK_READY = "mark_ready"
OPERATION_PREPARE_DELIVERY = "prepare_report_delivery"
OPERATION_EXECUTE_SEND = "execute_delivery_send"
OPERATION_MARK_FAILED = "mark_delivery_failed"
OPERATION_RETRY_DELIVERY = "retry_delivery"
OPERATION_PORTAL_PUBLISH = "publish_report_portal"
OPERATION_WEBHOOK_RECEIVED = "communication_webhook_received"

CHANNEL_ACTION_MAP = {
    "WHATSAPP": "report.whatsapp_delivery",
    "EMAIL": "report.email_delivery",
    "SMS": "report.sms_delivery",
    "PORTAL": "report.portal_delivery",
}
