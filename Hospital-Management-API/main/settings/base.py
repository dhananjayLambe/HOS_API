"""Shared Django settings. Load an environment file before importing this module."""

import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

# main/settings/base.py -> Hospital-Management-API/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _env_bool(name, default="false"):
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


def _env_list(name, default=""):
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _env_first(*names, default=""):
    for name in names:
        value = os.getenv(name)
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return default


SECRET_KEY = _env_first("SECRET_KEY", "DJANGO_SECRET_KEY")
DEBUG = _env_bool("DEBUG", os.getenv("DJANGO_DEBUG", "false"))
ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Diagnostics commerce: allow sum-of-service fallback when BranchPackagePricing missing (default off).
DIAGNOSTICS_ALLOW_DERIVED_PACKAGE_PRICING = False
MARKETPLACE_RECOMMENDATION_TTL_SECONDS = int(os.getenv("MARKETPLACE_RECOMMENDATION_TTL_SECONDS", "900"))
MARKETPLACE_DISPLAY_MRP_MARKUP_PERCENT = int(os.getenv("MARKETPLACE_DISPLAY_MRP_MARKUP_PERCENT", "15"))

# When routing finds no eligible lab, persist up to this many ineligible-branch snapshots
# (is_eligible=False) for support / explainability (full evaluation can be huge).
DIAGNOSTIC_ROUTING_MAX_REJECT_SNAPSHOTS = int(os.getenv("DIAGNOSTIC_ROUTING_MAX_REJECT_SNAPSHOTS", "50"))

# Verbose routing pipeline + plain-language patient/test/lab lines on logger
# ``diagnostics_engine.services.routing``. When you set either env below, settings also attach a
# StreamHandler so INFO lines appear in the runserver terminal (otherwise only WARNING+ may show).
#   export DIAGNOSTIC_ROUTING_JOURNEY_LOG=1
#   export DIAGNOSTIC_ROUTING_JOURNEY_HUMAN_LOG=1
# Eligibility pricing ladder + sample SQL (per branch): export DIAGNOSTIC_ROUTING_PRICING_DEBUG=1
# or set DIAGNOSTICS_ROUTING_JOURNEY_LOG = True below.
DIAGNOSTICS_ROUTING_JOURNEY_LOG = os.getenv("DIAGNOSTIC_ROUTING_JOURNEY_LOG", "").lower() in (
    "1",
    "true",
    "yes",
    "on",
)

# Investigation suggestions (explicit feature flags and limits)
ENABLE_SUGGESTIONS = os.getenv("ENABLE_SUGGESTIONS", "true").lower() in ("1", "true", "yes", "on")
ENABLE_PACKAGE_SUGGESTIONS = os.getenv("ENABLE_PACKAGE_SUGGESTIONS", "true").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
INV_SUGGEST_MAX_COMMON = int(os.getenv("INV_SUGGEST_MAX_COMMON", "8"))
INV_SUGGEST_MAX_RECOMMENDED = int(os.getenv("INV_SUGGEST_MAX_RECOMMENDED", "12"))
INV_SUGGEST_MAX_PACKAGES = int(os.getenv("INV_SUGGEST_MAX_PACKAGES", "4"))
INV_SUGGEST_MAX_PER_CATEGORY = int(os.getenv("INV_SUGGEST_MAX_PER_CATEGORY", "3"))
INV_SUGGEST_MAX_PACKAGE_SIZE = int(os.getenv("INV_SUGGEST_MAX_PACKAGE_SIZE", "25"))
INV_SUGGEST_CACHE_TTL_SECONDS = int(os.getenv("INV_SUGGEST_CACHE_TTL_SECONDS", "120"))

# Support Investigation API throttling (M5.6)
SUPPORT_SEARCH_RATE = os.getenv("SUPPORT_SEARCH_RATE", "60/min")
SUPPORT_LOOKUP_RATE = os.getenv("SUPPORT_LOOKUP_RATE", "120/min")
SUPPORT_TIMELINE_RATE = os.getenv("SUPPORT_TIMELINE_RATE", "120/min")

# Diagnostic report artifact uploads (per-file and batch limits)
MAX_REPORT_UPLOAD_SIZE_MB = int(os.getenv("MAX_REPORT_UPLOAD_SIZE_MB", "20"))
MAX_REPORT_BATCH_UPLOAD_SIZE_MB = int(os.getenv("MAX_REPORT_BATCH_UPLOAD_SIZE_MB", "100"))
MAX_REPORT_UPLOAD_FILES = int(os.getenv("MAX_REPORT_UPLOAD_FILES", "10"))

# Report object storage (S3) — optional; local MEDIA_ROOT when unset
# REPORT_ARTIFACT_STORAGE:
#   auto  — use S3 when AWS_REPORTS_BUCKET is set, else local MEDIA_ROOT (default; best for env promotion)
#   local — always stream/serve from MEDIA_ROOT (dev/staging without S3)
#   s3    — require AWS_REPORTS_BUCKET and issue presigned URLs (production)
AWS_REPORTS_BUCKET = os.getenv("AWS_REPORTS_BUCKET", "").strip() or None
REPORT_ARTIFACT_STORAGE = (
    os.getenv("REPORT_ARTIFACT_STORAGE", "auto").strip().lower() or "auto"
)
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", os.getenv("AWS_REGION", "ap-south-1"))
AWS_S3_SIGNATURE_VERSION = os.getenv("AWS_S3_SIGNATURE_VERSION", "s3v4")
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_S3_OBJECT_PARAMETERS = {"ServerSideEncryption": os.getenv("AWS_S3_SSE", "AES256")}
REPORT_PRESIGNED_URL_EXPIRY_SECONDS = int(os.getenv("REPORT_PRESIGNED_URL_EXPIRY_SECONDS", "300"))
IDEMPOTENCY_KEY_TTL_HOURS = int(os.getenv("IDEMPOTENCY_KEY_TTL_HOURS", "24"))
REPORT_DELIVERY_ASYNC = os.getenv("REPORT_DELIVERY_ASYNC", "true").lower() in ("1", "true", "yes", "on")

# Use S3 Django storage backend only when mode resolves to s3
_REPORTS_USE_S3_STORAGE = REPORT_ARTIFACT_STORAGE == "s3" or (
    REPORT_ARTIFACT_STORAGE == "auto" and bool(AWS_REPORTS_BUCKET)
)

if _REPORTS_USE_S3_STORAGE and AWS_REPORTS_BUCKET:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "bucket_name": AWS_REPORTS_BUCKET,
                "region_name": AWS_S3_REGION_NAME,
                "signature_version": AWS_S3_SIGNATURE_VERSION,
                "file_overwrite": AWS_S3_FILE_OVERWRITE,
                "default_acl": AWS_DEFAULT_ACL,
                "object_parameters": AWS_S3_OBJECT_PARAMETERS,
            },
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# Placeholder public report download base (never expose raw S3 URLs in delivery metadata)
REPORT_PUBLIC_DOWNLOAD_BASE_URL = os.getenv(
    "REPORT_PUBLIC_DOWNLOAD_BASE_URL",
    "https://doctorprocare.com/report-download",
)

# Consultation summary caching (feature-flagged)
ENABLE_CONSULTATION_SUMMARY_CACHE = os.getenv("ENABLE_CONSULTATION_SUMMARY_CACHE", "false").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
CONSULTATION_SUMMARY_CACHE_TTL_SECONDS = int(os.getenv("CONSULTATION_SUMMARY_CACHE_TTL_SECONDS", "900"))
PRESCRIPTION_TIMING_SLOT_MAX = int(os.getenv("PRESCRIPTION_TIMING_SLOT_MAX", "2"))

# WhatsApp prescription delivery (Phase 1)
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
WHATSAPP_BUSINESS_ID = os.getenv("WHATSAPP_BUSINESS_ID", "").strip()
WHATSAPP_WEBHOOK_VERIFY_TOKEN = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "").strip()
WHATSAPP_PRESCRIPTION_TEMPLATE_NAME = os.getenv(
    "WHATSAPP_PRESCRIPTION_TEMPLATE_NAME",
    "consultant_utlity",
).strip()
# Meta language code on the approved template (consultant_utlity uses en).
WHATSAPP_TEMPLATE_LANGUAGE_CODE = os.getenv("WHATSAPP_TEMPLATE_LANGUAGE_CODE", "en").strip() or "en"
# Comma-separated body variable keys sent to Meta (order must match {{1}}, {{2}}, … in template).
# consultant_utlity: patient_name, doctor_name, medicine_block, test_block (no URL variable).
WHATSAPP_TEMPLATE_BODY_PARAM_KEYS = os.getenv(
    "WHATSAPP_TEMPLATE_BODY_PARAM_KEYS",
    "patient_name,doctor_name,medicine_block,test_block",
).strip()
WHATSAPP_API_BASE_URL = os.getenv("WHATSAPP_API_BASE_URL", "https://graph.facebook.com/v21.0").rstrip("/")
PRESCRIPTION_DOWNLOAD_BASE_URL = os.getenv(
    "PRESCRIPTION_DOWNLOAD_BASE_URL",
    "https://doctorprocare.com",
).rstrip("/")
PRESCRIPTION_WHATSAPP_ASYNC = os.getenv("PRESCRIPTION_WHATSAPP_ASYNC", "true").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
WHATSAPP_SUMMARY_MAX_MEDICINES = int(os.getenv("WHATSAPP_SUMMARY_MAX_MEDICINES", "5"))
WHATSAPP_SUMMARY_MAX_TESTS = int(os.getenv("WHATSAPP_SUMMARY_MAX_TESTS", "5"))
WHATSAPP_USE_SIMULATED_PROVIDER = os.getenv("WHATSAPP_USE_SIMULATED_PROVIDER", "").lower() in (
    "1",
    "true",
    "yes",
    "on",
) or not WHATSAPP_ACCESS_TOKEN
# Diagnostic test recommendation (M4.3/4.4) — after prescription WhatsApp succeeds.
WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED = os.getenv(
    "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED",
    "true",
).lower() in ("1", "true", "yes", "on")
WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_NAME = os.getenv(
    "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_NAME",
    "diagnostic_test_recommendation_v3",
).strip()
WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_BODY_PARAM_KEYS = os.getenv(
    "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_BODY_PARAM_KEYS",
    "patient_name,test_names,mrp,quoted_price,savings",
).strip()
WHATSAPP_DIAGNOSTIC_RECOMMENDATION_FLAT_TEMPLATE_NAME = os.getenv(
    "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_FLAT_TEMPLATE_NAME",
    "",
).strip()
WHATSAPP_DIAGNOSTIC_RECOMMENDATION_FLAT_TEMPLATE_BODY_PARAM_KEYS = os.getenv(
    "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_FLAT_TEMPLATE_BODY_PARAM_KEYS",
    "patient_name,test_names,quoted_price",
).strip()
WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID = os.getenv("WHATSAPP_DIAGNOSTIC_BOOKING_FLOW_ID", "").strip()
# M5 only: set true when recommendation template button is Meta Flow (not Quick Reply v3).
WHATSAPP_DIAGNOSTIC_RECOMMENDATION_USE_FLOW_BUTTON = os.getenv(
    "WHATSAPP_DIAGNOSTIC_RECOMMENDATION_USE_FLOW_BUTTON",
    "false",
).lower() in ("1", "true", "yes", "on")
# India (+91): prepended to 10-digit local numbers for Meta Cloud API (E.164 without +).
WHATSAPP_DEFAULT_COUNTRY_CODE = os.getenv("WHATSAPP_DEFAULT_COUNTRY_CODE", "91").strip() or "91"

# Appointment booking: max days from today that a slot can be booked (create API).
MAX_BOOKING_DAYS = int(os.getenv("MAX_BOOKING_DAYS", "30"))
# Minimum lead time before slot start for same-day booking (slots API + create validation).
BOOKING_SLOT_LEAD_BUFFER_MINUTES = int(os.getenv("BOOKING_SLOT_LEAD_BUFFER_MINUTES", "5"))

APPOINTMENT_SLOTS_THROTTLE = os.getenv("APPOINTMENT_SLOTS_THROTTLE", "120/min")


# Application definition

INSTALLED_APPS = [
    "channels",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Apps
    "account.apps.AccountConfig",
    "doctor.apps.DoctorConfig",
    "hospitalAdmin.apps.HospitaladminConfig",
    "hospital_mgmt.apps.HospitalMgmtConfig",
    "clinic.apps.ClinicConfig",
    "patient_account.apps.PatientAccountConfig",
    "helpdesk.apps.HelpdeskConfig",
    "appointments.apps.AppointmentsConfig",
    "reports.apps.ReportsConfig",
    "queue_management.apps.QueueManagementConfig",
    "consultations_core.apps.ConsultationsCoreConfig",
    "labs.apps.LabsConfig",
    "consultation_config.apps.ConsultationConfigConfig",
    "support.apps.SupportConfig",
    "tasks.apps.TasksConfig",
    "caleder_events.apps.CalederEventsConfig",
    "medicines.apps.MedicinesConfig",
    "analytics.apps.AnalyticsConfig",
    "diagnostics_engine.apps.DiagnosticsEngineConfig",
    "doctor_report_workspace.apps.DoctorReportWorkspaceConfig",
    "notifications.apps.NotificationsConfig",
    "clinical_audit.apps.ClinicalAuditConfig",
    "business_audit.apps.BusinessAuditConfig",
    "support_trace.apps.SupportTraceConfig",
    "clinical_documentation.apps.ClinicalDocumentationConfig",
    # rest_framework
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django.contrib.postgres",
    "django_celery_results",
    "django_ratelimit",
    "drf_yasg",
    "core",
    "corsheaders",
]

REST_FRAMEWORK = {
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_TOKEN_LIFETIME": {
        "admin": timedelta(minutes=60),
        "doctor": timedelta(days=60),
        "patient": timedelta(days=30),
    },
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {
        "registration": "10/min",
        "user": "10000/day",
        "anon": "1000/day",
        "appointment_slots": APPOINTMENT_SLOTS_THROTTLE,
        "support_search": SUPPORT_SEARCH_RATE,
        "support_lookup": SUPPORT_LOOKUP_RATE,
        "support_timeline": SUPPORT_TIMELINE_RATE,
    },
    "DATETIME_FORMAT": "%Y-%m-%d %H:%M:%S",
}

# SimpleJWT settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "BLACKLIST_ENABLED": True,
}

# Swagger / OpenAPI (drf-yasg) — JWT Bearer auth for "Authorize" in Swagger UI
SWAGGER_SETTINGS = {
    "USE_SESSION_AUTH": False,
    "SECURITY_DEFINITIONS": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": (
                "JWT token from a login endpoint. "
                'Admin: POST /api/admin/login/ with {"username": "...", "password": "..."}. '
                "Doctor: POST /api/doctor/login/. "
                "Enter: Bearer <access_token>"
            ),
        },
    },
}

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "shared.logging.middleware.CorrelationMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "corsheaders.middleware.CorsMiddleware",
]

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = _env_list("CSRF_TRUSTED_ORIGINS")
CORS_PREFLIGHT_MAX_AGE = 86400

ROOT_URLCONF = "main.urls"
AUTH_USER_MODEL = "account.User"
WSGI_APPLICATION = "main.wsgi.application"
ASGI_APPLICATION = "main.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "demo5_db"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"

USE_I18N = True

USE_L10N = True

# Datetimes are stored UTC in the DB (USE_TZ); localdate(), template dates, and queue
# "today" filters use TIME_ZONE. Default IST for India; override e.g. DJANGO_TIME_ZONE=UTC for CI.
USE_TZ = True
TIME_ZONE = os.environ.get("DJANGO_TIME_ZONE", "Asia/Kolkata")

STATIC_URL = "/static/"
_static_dir = os.path.join(BASE_DIR, "static")
STATICFILES_DIRS = [_static_dir] if os.path.isdir(_static_dir) else []
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

MEDIA_URL = "/media/"
# Labs (and other apps) store uploads under this tree; Labs uses labs/organizations/<uuid>/… (see labs.utils.upload_paths).
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_URL = os.getenv("REDIS_URL", "").strip() or f"redis://{REDIS_HOST}:{REDIS_PORT}/1"

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "IGNORE_EXCEPTIONS": True,
        },
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(REDIS_HOST, REDIS_PORT)],
        },
    },
}

CELERY_BROKER_URL = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_BACKEND = "django-db"
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "").lower() in (
    "1",
    "true",
    "yes",
    "on",
)
CELERY_TASK_EAGER_PROPAGATES = CELERY_TASK_ALWAYS_EAGER

LAB_ASSIGNMENT_AUTO_REJECT_MINUTES = int(
    os.environ.get("LAB_ASSIGNMENT_AUTO_REJECT_MINUTES", "60"),
)
BOOKING_CONFIRMATION_TIMEOUT_MINUTES = int(
    os.environ.get("BOOKING_CONFIRMATION_TIMEOUT_MINUTES", "1440"),
)

CELERY_BEAT_SCHEDULE = {
    "labs-auto-reject-stale-assignments": {
        "task": "labs.auto_reject_stale_lab_assignments",
        "schedule": timedelta(minutes=2),
    },
    "expire-stale-recommendations": {
        "task": "notifications.tasks.expire_stale_recommendations",
        "schedule": timedelta(minutes=5),
    },
    "expire-stale-bookings": {
        "task": "diagnostics_engine.expire_stale_bookings",
        "schedule": timedelta(minutes=5),
    },
}


LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {
            "format": "[{asctime}] {levelname} {name} - {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": os.path.join(LOG_DIR, "info.log"),
            "formatter": "simple",
        },
        "error_file": {
            "level": "ERROR",
            "class": "logging.FileHandler",
            "filename": os.path.join(LOG_DIR, "error.log"),
            "formatter": "simple",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["file", "error_file"],
            "level": "INFO",
            "propagate": True,
        },
    },
}

# Console INFO for diagnostics routing journey (human + technical) when env is set.
_routing_journey_console_env = (
    os.environ.get("DIAGNOSTIC_ROUTING_JOURNEY_HUMAN_LOG", "").strip().lower() in ("1", "true", "yes", "on")
    or os.environ.get("DIAGNOSTIC_ROUTING_JOURNEY_LOG", "").strip().lower() in ("1", "true", "yes", "on")
)
if _routing_journey_console_env:
    LOGGING["handlers"]["routing_journey_console"] = {
        "class": "logging.StreamHandler",
        "level": "INFO",
        "formatter": "simple",
    }
    LOGGING["loggers"]["diagnostics_engine.services.routing"] = {
        "handlers": ["routing_journey_console", "file"],
        "level": "INFO",
        "propagate": False,
    }

from shared.logging.config import LoggingConfig, validate_logging_config
from shared.logging.constants import Environment, LogLevel
from shared.logging.factory import set_pending_logging_config

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
_LOGGING_ENV_ALIASES = {"uat": "staging"}
_logging_environment_name = _LOGGING_ENV_ALIASES.get(ENVIRONMENT, ENVIRONMENT)

_LOGGING_HANDLER_PRESETS: dict[str, tuple[str, ...]] = {
    "development": ("console",),
    "test": ("console",),
    "staging": ("console", "cloudwatch"),
    "uat": ("console", "cloudwatch"),
    "production": ("console", "cloudwatch"),
}

_log_handlers = list(_LOGGING_HANDLER_PRESETS.get(ENVIRONMENT, ("console",)))
_cloudwatch_log_group = os.getenv("CLOUDWATCH_LOG_GROUP")
_cloudwatch_region = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION"))
if "cloudwatch" in _log_handlers and (not _cloudwatch_log_group or not _cloudwatch_region):
    _log_handlers = [handler for handler in _log_handlers if handler != "cloudwatch"]
if not _log_handlers:
    _log_handlers = ["console"]

try:
    _logging_environment = Environment(_logging_environment_name)
except ValueError as exc:
    raise ImproperlyConfigured(
        f"Unsupported ENVIRONMENT={ENVIRONMENT!r}. Use development, test, uat, staging, or production."
    ) from exc

DOCTORPROCARE_LOGGING_CONFIG = validate_logging_config(
    LoggingConfig(
        environment=_logging_environment,
        service_name=os.getenv("SERVICE_NAME", "doctorprocare-api"),
        application_version=os.getenv("APPLICATION_VERSION", "0.0.0"),
        log_level=LogLevel(os.getenv("LOG_LEVEL", "INFO")),
        handlers=tuple(_log_handlers),
        json_pretty=ENVIRONMENT == "development",
        cloudwatch_log_group=_cloudwatch_log_group,
        cloudwatch_region=_cloudwatch_region,
        cloudwatch_stream_name=os.getenv("CLOUDWATCH_LOG_STREAM"),
        retention_days=int(os.getenv("LOG_RETENTION_DAYS", "90"))
        if os.getenv("LOG_RETENTION_DAYS")
        else None,
    )
)

set_pending_logging_config(DOCTORPROCARE_LOGGING_CONFIG)
