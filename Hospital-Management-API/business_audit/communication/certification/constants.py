"""Communication certification constants."""

from business_audit.enums import BusinessAuditAction

COMMUNICATION_TERMINAL_ACTIONS = (
    BusinessAuditAction.REPORT_WHATSAPP_DELIVERY,
    BusinessAuditAction.REPORT_EMAIL_DELIVERY,
    BusinessAuditAction.REPORT_SMS_DELIVERY,
    BusinessAuditAction.REPORT_PORTAL_DELIVERY,
    BusinessAuditAction.REPORT_DELIVERY_FAILED,
)

COMMUNICATION_REQUIRED_READY = BusinessAuditAction.REPORT_READY

COMMUNICATION_CERTIFICATION_ACTIONS = (
    BusinessAuditAction.REPORT_READY,
    BusinessAuditAction.REPORT_DELIVERY_REQUESTED,
    BusinessAuditAction.REPORT_WHATSAPP_DELIVERY,
    BusinessAuditAction.REPORT_EMAIL_DELIVERY,
    BusinessAuditAction.REPORT_SMS_DELIVERY,
    BusinessAuditAction.REPORT_PORTAL_DELIVERY,
    BusinessAuditAction.REPORT_DELIVERY_FAILED,
    BusinessAuditAction.REPORT_DELIVERY_RETRIED,
)
