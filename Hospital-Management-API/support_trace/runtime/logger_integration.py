"""Logger framework integration for runtime metadata."""

from __future__ import annotations

import os

from support_trace.runtime.constants import (
    ENV_AWS_DEFAULT_REGION,
    ENV_AWS_REGION,
    ENV_CLOUDWATCH_LOG_GROUP,
    ENV_CLOUDWATCH_LOG_STREAM,
)


class LoggerIntegration:
    @classmethod
    def resolve_log_targets(cls) -> dict[str, str | None]:
        region = os.getenv(ENV_AWS_REGION) or os.getenv(ENV_AWS_DEFAULT_REGION)
        log_group = os.getenv(ENV_CLOUDWATCH_LOG_GROUP)
        log_stream = os.getenv(ENV_CLOUDWATCH_LOG_STREAM)
        if not log_group:
            log_group, log_stream = cls._from_django_settings()
        return {
            "log_group": log_group,
            "log_stream": log_stream,
            "log_region": region,
        }

    @classmethod
    def _from_django_settings(cls) -> tuple[str | None, str | None]:
        try:
            from django.conf import settings

            config = getattr(settings, "DOCTORPROCARE_LOGGING_CONFIG", None)
            if config is None:
                return None, None
            group = getattr(config, "cloudwatch_log_group", None)
            stream = getattr(config, "cloudwatch_log_stream", None)
            return group, stream
        except Exception:
            return None, None
