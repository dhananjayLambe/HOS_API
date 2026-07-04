"""DoctorProCare shared logging platform.

Purpose:
    Single logging abstraction for all DoctorProCare services.

Responsibility:
    Expose the stable public API for application code.

Future implementation:
    Application modules import from this package exclusively:

        from shared.logging import logger

    Application modules must never use ``import logging`` directly.
"""

from shared.logging.config import (
    HANDLER_CLOUDWATCH,
    HANDLER_CONSOLE,
    LoggingConfig,
    validate_logging_config,
)
from shared.logging.constants import (
    Environment,
    EventType,
    LogLevel,
    LogModule,
    LogStatus,
)
from shared.logging.context import ContextManager, LogContext
from shared.logging.exceptions import ConfigurationError, LoggingError
from shared.logging.factory import (
    configure_logging,
    ensure_configured,
    set_pending_logging_config,
)
from shared.logging.logger import Logger, logger

__all__ = [
    "ConfigurationError",
    "ContextManager",
    "Environment",
    "EventType",
    "HANDLER_CLOUDWATCH",
    "HANDLER_CONSOLE",
    "LogContext",
    "LogLevel",
    "LogModule",
    "Logger",
    "LoggingConfig",
    "LoggingError",
    "LogStatus",
    "configure_logging",
    "ensure_configured",
    "logger",
    "set_pending_logging_config",
    "validate_logging_config",
]
