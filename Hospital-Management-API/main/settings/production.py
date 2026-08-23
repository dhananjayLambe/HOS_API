"""Production settings. Refuses to start with DEBUG, missing SECRET_KEY, or empty hosts."""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE_DIR / ".env.production")
load_dotenv(_BASE_DIR / ".env", override=False)

from .base import *  # noqa: E402, F401, F403
from .base import (  # noqa: E402
    ALLOWED_HOSTS,
    CORS_ALLOWED_ORIGINS,
    CSRF_TRUSTED_ORIGINS,
    SECRET_KEY,
    _env_bool,
    _require_environment_values,
)

if _env_bool("DEBUG", os.getenv("DJANGO_DEBUG", "false")):
    raise ImproperlyConfigured("DEBUG must be False in production (.env.production)")

DEBUG = False

if not SECRET_KEY:
    raise ImproperlyConfigured("SECRET_KEY must be set in .env.production")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS must be set in .env.production")
# Container healthchecks call http://127.0.0.1:8000/health/ from inside the API container.
for _healthcheck_host in ("127.0.0.1", "localhost"):
    if _healthcheck_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_healthcheck_host)
_require_environment_values("DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST")
if not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured("CORS_ALLOWED_ORIGINS must be set in .env.production")
if not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured("CSRF_TRUSTED_ORIGINS must be set in .env.production")

CORS_ALLOW_ALL_ORIGINS = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = _env_bool("SECURE_SSL_REDIRECT", "true")
SECURE_REDIRECT_EXEMPT = [r"^health/$"]
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
# Enable these only after confirming every relevant subdomain supports HTTPS.
SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS")
SECURE_HSTS_PRELOAD = _env_bool("SECURE_HSTS_PRELOAD")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

SIMPLE_JWT = {**SIMPLE_JWT, "SIGNING_KEY": SECRET_KEY}  # noqa: F405
