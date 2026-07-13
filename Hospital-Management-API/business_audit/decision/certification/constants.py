"""Routing decision certification constants."""

from business_audit.enums import BusinessAuditAction

ROUTING_TERMINAL_ACTIONS = (
    BusinessAuditAction.ROUTING_LAB_ASSIGNED,
    BusinessAuditAction.ROUTING_FAILED,
)

ROUTING_REQUIRED_STARTED = BusinessAuditAction.ROUTING_STARTED

ROUTING_CERTIFICATION_ACTIONS = (
    BusinessAuditAction.ROUTING_STARTED,
    BusinessAuditAction.ROUTING_RULE_EVALUATED,
    BusinessAuditAction.ROUTING_LAB_MATCHED,
    BusinessAuditAction.ROUTING_PRICE_COMPARED,
    BusinessAuditAction.ROUTING_DISCOUNT_APPLIED,
    BusinessAuditAction.ROUTING_LAB_ASSIGNED,
    BusinessAuditAction.ROUTING_FAILED,
    BusinessAuditAction.ROUTING_MANUAL_OVERRIDE,
)
