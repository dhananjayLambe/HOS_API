"""Enumerations for the Business Audit Framework."""

from django.db import models


class WorkflowType(models.TextChoices):
    RECOMMENDATION = "Recommendation", "Recommendation"
    BOOKING = "Booking", "Booking"
    ROUTING = "Routing", "Routing"
    REPORT_DELIVERY = "ReportDelivery", "Report Delivery"
    CONSULTATION = "Consultation", "Consultation"
    PRESCRIPTION = "Prescription", "Prescription"
    DIAGNOSTIC_REPORT = "DiagnosticReport", "Diagnostic Report"
    NOTIFICATION = "Notification", "Notification"
    PAYMENT = "Payment", "Payment"
    WHATSAPP_FLOW = "WhatsAppFlow", "WhatsApp Flow"
    HOME_COLLECTION = "HomeCollection", "Home Collection"
    MARKETPLACE = "Marketplace", "Marketplace"
    LABORATORY = "Laboratory", "Laboratory"


class EventCategory(models.TextChoices):
    RECOMMENDATION = "Recommendation", "Recommendation"
    NOTIFICATION = "Notification", "Notification"
    BOOKING = "Booking", "Booking"
    PAYMENT = "Payment", "Payment"
    INTEGRATION = "Integration", "Integration"
    ROUTING = "Routing", "Routing"
    DELIVERY = "Delivery", "Delivery"
    LABORATORY = "Laboratory", "Laboratory"
    MARKETPLACE = "Marketplace", "Marketplace"


class WorkflowStatus(models.TextChoices):
    STARTED = "Started", "Started"
    QUEUED = "Queued", "Queued"
    RUNNING = "Running", "Running"
    SUCCEEDED = "Succeeded", "Succeeded"
    FAILED = "Failed", "Failed"
    CANCELLED = "Cancelled", "Cancelled"
    RETRYING = "Retrying", "Retrying"
    TIMED_OUT = "TimedOut", "Timed Out"
    SKIPPED = "Skipped", "Skipped"
    COMPLETED = "Completed", "Completed"


class WorkflowOutcome(models.TextChoices):
    SUCCESS = "Success", "Success"
    FAILURE = "Failure", "Failure"
    PARTIAL = "Partial", "Partial"
    UNKNOWN = "Unknown", "Unknown"


class ActorType(models.TextChoices):
    DOCTOR = "Doctor", "Doctor"
    PATIENT = "Patient", "Patient"
    ADMIN = "Admin", "Admin"
    SYSTEM = "System", "System"
    SCHEDULER = "Scheduler", "Scheduler"
    CELERY = "Celery", "Celery"
    WEBHOOK = "Webhook", "Webhook"
    INTEGRATION = "Integration", "Integration"


class ExternalProvider(models.TextChoices):
    META = "Meta", "Meta"
    AWS = "AWS", "AWS"
    RAZORPAY = "Razorpay", "Razorpay"
    STRIPE = "Stripe", "Stripe"
    GOOGLE = "Google", "Google"
    TWILIO = "Twilio", "Twilio"
    SENDGRID = "SendGrid", "SendGrid"
    LOCAL_LAB = "LocalLab", "Local Lab"
    ONE_MG = "OneMg", "1mg"
    PHARM_EASY = "PharmEasy", "PharmEasy"
    INTERNAL = "Internal", "Internal"


class DecisionStrategy(models.TextChoices):
    PRICE_FIRST = "PRICE_FIRST", "Price First"
    QUALITY_FIRST = "QUALITY_FIRST", "Quality First"
    SLA_FIRST = "SLA_FIRST", "SLA First"
    HYBRID = "HYBRID", "Hybrid"
    MANUAL = "MANUAL", "Manual"
    AI = "AI", "AI"
    ROUND_ROBIN = "ROUND_ROBIN", "Round Robin"
    CUSTOM = "CUSTOM", "Custom"


class BusinessResourceType(models.TextChoices):
    RECOMMENDATION = "Recommendation", "Recommendation"
    BOOKING = "Booking", "Booking"
    DECISION = "Decision", "Decision"
    COMMUNICATION = "Communication", "Communication"
    ORDER = "Order", "Order"
    ASSIGNMENT = "Assignment", "Assignment"
    COLLECTION = "Collection", "Collection"
    REPORT = "Report", "Report"
    CONSULTATION = "Consultation", "Consultation"
    PRESCRIPTION = "Prescription", "Prescription"
    MESSAGE = "Message", "Message"
    PAYMENT = "Payment", "Payment"
    SUBSCRIPTION = "Subscription", "Subscription"
    WORKFLOW = "Workflow", "Workflow"


class BusinessAuditAction(models.TextChoices):
    WORKFLOW_STARTED = "workflow.started", "Workflow Started"
    WORKFLOW_QUEUED = "workflow.queued", "Workflow Queued"
    WORKFLOW_RUNNING = "workflow.running", "Workflow Running"
    WORKFLOW_COMPLETED = "workflow.completed", "Workflow Completed"
    WORKFLOW_FAILED = "workflow.failed", "Workflow Failed"
    WORKFLOW_RETRYING = "workflow.retrying", "Workflow Retrying"
    WORKFLOW_CANCELLED = "workflow.cancelled", "Workflow Cancelled"
    WORKFLOW_TIMED_OUT = "workflow.timed_out", "Workflow Timed Out"
    WORKFLOW_SKIPPED = "workflow.skipped", "Workflow Skipped"
    RECOMMENDATION_GENERATED = "recommendation.generated", "Recommendation Generated"
    RECOMMENDATION_SENT = "recommendation.sent", "Recommendation Sent"
    RECOMMENDATION_DELIVERED = "recommendation.delivered", "Recommendation Delivered"
    RECOMMENDATION_READ = "recommendation.read", "Recommendation Read"
    RECOMMENDATION_FAILED = "recommendation.failed", "Recommendation Failed"
    RECOMMENDATION_RETRIED = "recommendation.retried", "Recommendation Retried"
    RECOMMENDATION_EXPIRED = "recommendation.expired", "Recommendation Expired"
    BOOKING_CREATED = "booking.created", "Booking Created"
    BOOKING_CONFIRMED = "booking.confirmed", "Booking Confirmed"
    BOOKING_MODIFIED = "booking.modified", "Booking Modified"
    BOOKING_CANCELLED = "booking.cancelled", "Booking Cancelled"
    BOOKING_EXPIRED = "booking.expired", "Booking Expired"
    BOOKING_CLOSED = "booking.closed", "Booking Closed"
    ROUTING_STARTED = "routing.started", "Routing Started"
    ROUTING_RULE_EVALUATED = "routing.rule_evaluated", "Routing Rule Evaluated"
    ROUTING_LAB_MATCHED = "routing.lab_matched", "Routing Lab Matched"
    ROUTING_PRICE_COMPARED = "routing.price_compared", "Routing Price Compared"
    ROUTING_DISCOUNT_APPLIED = "routing.discount_applied", "Routing Discount Applied"
    ROUTING_LAB_ASSIGNED = "routing.lab_assigned", "Routing Lab Assigned"
    ROUTING_FAILED = "routing.failed", "Routing Failed"
    ROUTING_MANUAL_OVERRIDE = "routing.manual_override", "Routing Manual Override"
    REPORT_READY = "report.ready", "Report Ready"
    REPORT_DELIVERY_REQUESTED = "report.delivery_requested", "Report Delivery Requested"
    REPORT_WHATSAPP_DELIVERY = "report.whatsapp_delivery", "Report WhatsApp Delivery"
    REPORT_EMAIL_DELIVERY = "report.email_delivery", "Report Email Delivery"
    REPORT_SMS_DELIVERY = "report.sms_delivery", "Report SMS Delivery"
    REPORT_PORTAL_DELIVERY = "report.portal_delivery", "Report Portal Delivery"
    REPORT_DELIVERY_FAILED = "report.delivery_failed", "Report Delivery Failed"
    REPORT_DELIVERY_RETRIED = "report.delivery_retried", "Report Delivery Retried"
    COMMUNICATION_WEBHOOK_RECEIVED = "communication.webhook_received", "Communication Webhook Received"
