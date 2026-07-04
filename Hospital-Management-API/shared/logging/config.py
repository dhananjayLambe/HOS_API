"""Logging configuration model for the DoctorProCare logging platform.

Purpose:
    Define the configuration data structure and pure validation for logging.

Responsibility:
    Hold typed configuration fields and validate them.
    No environment variable reads and no Django imports.

Future implementation:
    application_version will be injected into log records by the formatter.
"""

from __future__ import annotations

from dataclasses import dataclass

from shared.logging.constants import Environment, LogLevel
from shared.logging.exceptions import ConfigurationError

HANDLER_CONSOLE = "console"
HANDLER_CLOUDWATCH = "cloudwatch"

SUPPORTED_HANDLERS = frozenset({HANDLER_CONSOLE, HANDLER_CLOUDWATCH})


@dataclass(frozen=True)
class LoggingConfig:
    """Immutable logging configuration for a single deployment environment.

    Attributes:
        environment: Active deployment environment.
        service_name: Logical service identifier (e.g. doctorprocare-api).
        application_version: Deployed application version for traceability.
        log_level: Minimum severity level to emit.
        handlers: Ordered handler names (e.g. console, cloudwatch).
        json_pretty: Whether console JSON output is pretty-printed.
        cloudwatch_log_group: Target CloudWatch log group when cloudwatch enabled.
        cloudwatch_region: AWS region for CloudWatch when cloudwatch enabled.
        cloudwatch_stream_name: Optional fixed log stream name.
        retention_days: Log retention period in days, if applicable.
    """

    environment: Environment
    service_name: str
    application_version: str
    log_level: LogLevel
    handlers: tuple[str, ...]
    json_pretty: bool = False
    cloudwatch_log_group: str | None = None
    cloudwatch_region: str | None = None
    cloudwatch_stream_name: str | None = None
    retention_days: int | None = None


def validate_logging_config(config: LoggingConfig) -> LoggingConfig:
    """Validate a LoggingConfig instance.

    Args:
        config: Configuration to validate.

    Returns:
        LoggingConfig: The same config if valid.

    Raises:
        ConfigurationError: If configuration is invalid.
    """
    if not config.service_name.strip():
        raise ConfigurationError("service_name must not be empty")

    if not config.application_version.strip():
        raise ConfigurationError("application_version must not be empty")

    if not config.handlers:
        raise ConfigurationError("handlers must contain at least one handler")

    for handler_name in config.handlers:
        if handler_name not in SUPPORTED_HANDLERS:
            raise ConfigurationError(f"unsupported handler: {handler_name}")

    if HANDLER_CLOUDWATCH in config.handlers:
        if not config.cloudwatch_log_group or not config.cloudwatch_log_group.strip():
            raise ConfigurationError(
                "cloudwatch_log_group is required when cloudwatch handler is enabled"
            )
        if not config.cloudwatch_region or not config.cloudwatch_region.strip():
            raise ConfigurationError(
                "cloudwatch_region is required when cloudwatch handler is enabled"
            )

    return config
