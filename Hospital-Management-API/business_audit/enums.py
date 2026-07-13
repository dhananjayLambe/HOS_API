"""Enumerations for the Business Audit Framework."""

from django.db import models


class WorkflowType(models.TextChoices):
    RECOMMENDATION = "Recommendation", "Recommendation"
    BOOKING = "Booking", "Booking"
    ROUTING = "Routing", "Routing"
    REPORT_DELIVERY = "ReportDelivery", "Report Delivery"
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


class BusinessResourceType(models.TextChoices):
    RECOMMENDATION = "Recommendation", "Recommendation"
    BOOKING = "Booking", "Booking"
    ORDER = "Order", "Order"
    ASSIGNMENT = "Assignment", "Assignment"
    COLLECTION = "Collection", "Collection"
    REPORT = "Report", "Report"
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
