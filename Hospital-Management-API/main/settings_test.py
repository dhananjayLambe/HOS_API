"""
Test settings: PostgreSQL test DB, no Redis side effects, eager Celery, UTC time.
Override with env: DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, TEST_DB_NAME.
"""

import os
import tempfile

from .settings import *  # noqa: F401,F403

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

ALLOWED_HOSTS = ["*"]
USE_TZ = True
TIME_ZONE = "UTC"

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

DEBUG = False
LOGGING_CONFIG = None
MEDIA_ROOT = tempfile.mkdtemp(prefix="hos_test_media_")

REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_CLASSES": []}  # noqa: F405


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
