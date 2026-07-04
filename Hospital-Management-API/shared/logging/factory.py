"""Logging factory for the DoctorProCare logging platform.

Purpose:
    Build handlers and dispatchers from LoggingConfig.
    Initialize the shared logger without replacing the singleton.

Responsibility:
    Handler registry, dispatcher creation, idempotent configure_logging().
"""

from __future__ import annotations

import atexit
import threading
from collections.abc import Callable

from shared.logging.config import (
    HANDLER_CLOUDWATCH,
    HANDLER_CONSOLE,
    LoggingConfig,
    validate_logging_config,
)
from shared.logging.constants import SCHEMA_VERSION, LogModule
from shared.logging.dispatcher import LogDispatcher
from shared.logging.exceptions import ConfigurationError
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import BaseLogHandler, CloudWatchLogHandler, ConsoleLogHandler

_configured = False
_startup_emitted = False
_pending_config: LoggingConfig | None = None
_active_dispatcher: LogDispatcher | None = None
_shutdown_registered = False
_lock = threading.Lock()


def set_pending_logging_config(config: LoggingConfig) -> None:
    """Register configuration for lazy initialization on first log call.

    Args:
        config: Validated logging configuration.
    """
    global _pending_config
    validate_logging_config(config)
    _pending_config = config


def _create_console_handler(config: LoggingConfig) -> ConsoleLogHandler:
    return ConsoleLogHandler(JSONLogFormatter(pretty=config.json_pretty))


def _create_cloudwatch_handler(config: LoggingConfig) -> CloudWatchLogHandler:
    assert config.cloudwatch_log_group is not None
    assert config.cloudwatch_region is not None
    return CloudWatchLogHandler(
        log_group=config.cloudwatch_log_group,
        region=config.cloudwatch_region,
        formatter=JSONLogFormatter(pretty=False),
        stream_name=config.cloudwatch_stream_name,
        service_name=config.service_name,
    )


HANDLER_REGISTRY: dict[str, Callable[[LoggingConfig], BaseLogHandler]] = {
    HANDLER_CONSOLE: _create_console_handler,
    HANDLER_CLOUDWATCH: _create_cloudwatch_handler,
}


class LoggingFactory:
    """Creates handlers and dispatchers from LoggingConfig."""

    def __init__(self, config: LoggingConfig) -> None:
        """Initialize the factory with validated configuration.

        Args:
            config: Logging configuration.
        """
        self._config = validate_logging_config(config)

    @property
    def config(self) -> LoggingConfig:
        """Return the factory configuration."""
        return self._config

    def create_handlers(self) -> list[BaseLogHandler]:
        """Create handler instances declared in config.handlers.

        Returns:
            list[BaseLogHandler]: Ordered handler instances.

        Raises:
            ConfigurationError: If a handler name is not registered.
        """
        handlers: list[BaseLogHandler] = []
        for handler_name in self._config.handlers:
            factory_fn = HANDLER_REGISTRY.get(handler_name)
            if factory_fn is None:
                raise ConfigurationError(f"handler not registered: {handler_name}")
            handlers.append(factory_fn(self._config))
        return handlers

    def create_dispatcher(self) -> LogDispatcher:
        """Create a dispatcher with configured handlers.

        Returns:
            LogDispatcher: Dispatcher ready for log emission.
        """
        return LogDispatcher(handlers=self.create_handlers())


def _shutdown_logging() -> None:
    """Flush and close handlers on process exit."""
    global _active_dispatcher
    if _active_dispatcher is not None:
        _active_dispatcher.close()
        _active_dispatcher = None


def configure_logging(config: LoggingConfig) -> None:
    """Configure the shared logger with handlers from config (idempotent).

    Args:
        config: Logging configuration.

    Raises:
        ConfigurationError: If configuration is invalid.
    """
    global _configured, _startup_emitted, _active_dispatcher, _shutdown_registered

    validated = validate_logging_config(config)

    with _lock:
        if _configured:
            return

        factory = LoggingFactory(validated)
        dispatcher = factory.create_dispatcher()

        from shared.logging.logger import logger

        logger.configure(dispatcher)
        _active_dispatcher = dispatcher
        _configured = True

        if not _shutdown_registered:
            atexit.register(_shutdown_logging)
            _shutdown_registered = True

        if not _startup_emitted:
            logger.info(
                "Logging initialized",
                module=LogModule.MONITORING,
                action="logging.initialized",
                metadata={
                    "event": "logging.initialized",
                    "environment": validated.environment.value,
                    "service": validated.service_name,
                    "application_version": validated.application_version,
                    "handlers": list(validated.handlers),
                    "schema_version": SCHEMA_VERSION,
                    "log_level": validated.log_level.value,
                    "json": "enabled",
                },
            )
            _startup_emitted = True


def ensure_configured() -> None:
    """Configure logging lazily when a pending config was registered."""
    if _configured:
        return
    if _pending_config is None:
        return
    configure_logging(_pending_config)


def reset_logging_state_for_tests() -> None:
    """Reset factory module state. For unit tests only."""
    global _configured, _startup_emitted, _pending_config, _active_dispatcher
    with _lock:
        if _active_dispatcher is not None:
            _active_dispatcher.close()
        _configured = False
        _startup_emitted = False
        _pending_config = None
        _active_dispatcher = None
        from shared.logging.dispatcher import get_default_dispatcher
        from shared.logging.logger import logger

        logger.configure(get_default_dispatcher())
