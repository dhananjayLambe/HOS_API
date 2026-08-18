"""Test settings: isolated cache/channels, eager Celery, UTC. Do not use UAT or production databases."""

import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
os.environ.setdefault("ENVIRONMENT", "test")
load_dotenv(_BASE_DIR / ".env.development", override=False)
load_dotenv(_BASE_DIR / ".env", override=False)

from .base import *  # noqa: E402, F401, F403
from .base import REST_FRAMEWORK as _REST_FRAMEWORK  # noqa: E402

SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("DJANGO_SECRET_KEY") or "test-insecure-secret-key"
SIMPLE_JWT = {**SIMPLE_JWT, "SIGNING_KEY": SECRET_KEY}  # noqa: F405

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "demo5_db"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASSWORD", "123"),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "TEST": {
            "NAME": os.getenv("TEST_DB_NAME", "test_demo5_db"),
        },
    }
}

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
REPORT_DELIVERY_ASYNC = True

ALLOWED_HOSTS = ["*"]
USE_TZ = True
TIME_ZONE = "UTC"

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

DEBUG = False
LOGGING_CONFIG = None

# django_ratelimit requires shared cache in production; locmem is fine for tests.
SILENCED_SYSTEM_CHECKS = ["django_ratelimit.E003", "django_ratelimit.W001"]
MEDIA_ROOT = tempfile.mkdtemp(prefix="hos_test_media_")

REST_FRAMEWORK = {**_REST_FRAMEWORK, "DEFAULT_THROTTLE_CLASSES": []}

from shared.logging.config import LoggingConfig, validate_logging_config
from shared.logging.constants import Environment, LogLevel
from shared.logging.factory import set_pending_logging_config

DOCTORPROCARE_LOGGING_CONFIG = validate_logging_config(
    LoggingConfig(
        environment=Environment.TEST,
        service_name="doctorprocare-api-test",
        application_version="test",
        log_level=LogLevel.INFO,
        handlers=("console",),
        json_pretty=False,
    )
)
set_pending_logging_config(DOCTORPROCARE_LOGGING_CONFIG)


def _ensure_pg_trgm_on_connect(sender, connection, **kwargs):
    """Medicines / search GIN indexes use gin_trgm_ops; extension must exist before migrations."""
    if connection.vendor != "postgresql":
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    except Exception:
        pass


from django.db.backends.signals import connection_created

connection_created.connect(_ensure_pg_trgm_on_connect)
