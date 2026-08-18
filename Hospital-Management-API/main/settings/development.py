"""Development settings. DEBUG on, CORS open, local hosts."""

from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE_DIR / ".env.development")
load_dotenv(_BASE_DIR / ".env", override=False)

from .base import *  # noqa: E402, F401, F403
from .base import SECRET_KEY, _env_list  # noqa: E402

DEBUG = True
ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]")
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_HEADERS = ["*"]
CORS_ALLOW_METHODS = ["*"]
CORS_EXPOSE_HEADERS = ["*"]

if not SECRET_KEY:
    raise ImproperlyConfigured(
        "SECRET_KEY (or DJANGO_SECRET_KEY) must be set in .env.development"
    )

SIMPLE_JWT = {**SIMPLE_JWT, "SIGNING_KEY": SECRET_KEY}  # noqa: F405
