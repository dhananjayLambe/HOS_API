"""Runtime integration enumerations."""

from django.db import models


class RuntimeSource(models.TextChoices):
    LOGGER = "Logger", "Logger"
    CELERY = "Celery", "Celery"
    LAMBDA = "Lambda", "Lambda"
    ENV = "Env", "Environment"
