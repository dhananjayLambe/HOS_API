"""UAT settings. DEBUG off, explicit hosts and origins, secure cookies."""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE_DIR / ".env.uat")
load_dotenv(_BASE_DIR / ".env", override=False)

from .base import *  # noqa: E402, F401, F403
from .base import ALLOWED_HOSTS, SECRET_KEY, _env_bool  # noqa: E402

if os.getenv("DEBUG", "").strip().lower() in ("1", "true", "yes", "on"):
    raise ImproperlyConfigured("DEBUG must be False for UAT (.env.uat)")

DEBUG = False

if not SECRET_KEY:
    raise ImproperlyConfigured("SECRET_KEY must be set in .env.uat")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS must be set in .env.uat")

CORS_ALLOW_ALL_ORIGINS = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = _env_bool("SECURE_SSL_REDIRECT", "false")
SECURE_CONTENT_TYPE_NOSNIFF = True

SIMPLE_JWT = {**SIMPLE_JWT, "SIGNING_KEY": SECRET_KEY}  # noqa: F405
