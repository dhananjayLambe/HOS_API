"""Development settings. DEBUG on, CORS open, local hosts."""

from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE_DIR / ".env.development")
load_dotenv(_BASE_DIR / ".env", override=False)

from .base import *  # noqa: E402, F401, F403
from .base import SECRET_KEY, _env_list, LOGGING  # noqa: E402

DEBUG = True
ALLOWED_HOSTS = _env_list(
    "ALLOWED_HOSTS", "localhost,127.0.0.1,[::1],host.docker.internal"
)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_HEADERS = ["*"]
CORS_ALLOW_METHODS = ["*"]
CORS_EXPOSE_HEADERS = ["*"]

# Browser posts to Docker nginx on :8000/:8080; CSRF Origin must include those.
_CSRF_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(list(CSRF_TRUSTED_ORIGINS) + _CSRF_DEV_ORIGINS))

LOGGING["handlers"]["console"] = {
    "class": "logging.StreamHandler",
    "level": "INFO",
    "formatter": "simple",
}
LOGGING["loggers"]["django"] = {
    "handlers": ["console", "file", "error_file"],
    "level": "INFO",
    "propagate": False,
}
LOGGING["loggers"]["django.request"] = {
    "handlers": ["console", "error_file"],
    "level": "INFO",
    "propagate": False,
}
LOGGING["loggers"]["django.server"] = {
    "handlers": ["console"],
    "level": "INFO",
    "propagate": False,
}

if not SECRET_KEY:
    raise ImproperlyConfigured(
        "SECRET_KEY (or DJANGO_SECRET_KEY) must be set in .env.development"
    )

SIMPLE_JWT = {**SIMPLE_JWT, "SIGNING_KEY": SECRET_KEY}  # noqa: F405
