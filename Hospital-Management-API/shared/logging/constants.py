"""Central constants and enumerations for the DoctorProCare logging platform.

Purpose:
    Single source of truth for log levels, modules, statuses, environments,
    event types, and standard action name placeholders.

Responsibility:
    Define enums and string constants only. No runtime logic.

Future implementation:
    Consumed by logger, formatter, handlers, config, and context modules.
    Action constants will expand as modules are instrumented.
"""

from enum import StrEnum

SCHEMA_VERSION = 1

CORRELATION_ID_VERSION = 4
CORRELATION_ID_LENGTH = 36

CONTEXT_FIELD_NAMES = (
    "correlation_id",
    "request_id",
    "user_id",
    "user_role",
    "patient_account_id",
    "patient_profile_id",
    "consultation_id",
    "encounter_id",
    "recommendation_id",
    "booking_id",
    "laboratory_id",
    "report_id",
    "whatsapp_message_id",
)

FRAMEWORK_CONTEXT_FIELDS = frozenset(CONTEXT_FIELD_NAMES)

CELERY_LOG_CONTEXT_HEADER = "doctorprocare_log_context"

CORRELATION_ID_HTTP_HEADER = "X-Correlation-ID"
REQUEST_ID_HTTP_HEADER = "X-Request-ID"


class LogLevel(StrEnum):
    """Standard log severity levels."""

    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogModule(StrEnum):
    """Approved logging module identifiers."""

    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    API = "api"
    CONSULTATION = "consultation"
    PRESCRIPTION = "prescription"
    RECOMMENDATION = "recommendation"
    BOOKING = "booking"
    ROUTING = "routing"
    LABORATORY = "laboratory"
    REPORTS = "reports"
    WHATSAPP = "whatsapp"
    CELERY = "celery"
    DATABASE = "database"
    STORAGE = "storage"
    SCHEDULER = "scheduler"
    MONITORING = "monitoring"
    INFRASTRUCTURE = "infrastructure"
    SECURITY = "security"


class LogStatus(StrEnum):
    """Workflow outcome statuses for structured log records."""

    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    RETRIED = "RETRIED"
    PENDING = "PENDING"


class Environment(StrEnum):
    """Deployment environment names."""

    DEVELOPMENT = "development"
    TEST = "test"
    STAGING = "staging"
    PRODUCTION = "production"


class EventType(StrEnum):
    """High-level event categories for audit and performance logging."""

    APPLICATION = "application"
    CLINICAL_AUDIT = "clinical_audit"
    BUSINESS_AUDIT = "business_audit"
    PERFORMANCE = "performance"


# Action name placeholders (dot notation). Expand in future milestones.
ACTION_CONSULTATION_STARTED = "consultation.started"
ACTION_CONSULTATION_COMPLETED = "consultation.completed"
ACTION_BOOKING_SUBMITTED = "booking.submitted"
ACTION_REPORT_UPLOADED = "report.uploaded"
ACTION_WHATSAPP_SENT = "whatsapp.sent"
