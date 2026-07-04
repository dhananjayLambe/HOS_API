"""Import and public API surface tests for shared.logging."""

import importlib

import pytest

from shared.logging import (
    ConfigurationError,
    Environment,
    EventType,
    LogContext,
    LogLevel,
    LogModule,
    Logger,
    LoggingError,
    LogStatus,
    logger,
)
from shared.logging.constants import (
    ACTION_BOOKING_SUBMITTED,
    ACTION_CONSULTATION_STARTED,
)


SUBMODULES = [
    "shared.logging.constants",
    "shared.logging.exceptions",
    "shared.logging.config",
    "shared.logging.context",
    "shared.logging.formatter",
    "shared.logging.handlers",
    "shared.logging.logger",
    "shared.logging.middleware",
    "shared.logging.utils",
    "shared.logging.record",
    "shared.logging.validation",
    "shared.logging.exception_builder",
    "shared.logging.certification",
    "shared.logging.cloudwatch_buffer",
    "shared.logging.dispatcher",
    "shared.logging.factory",
]


def test_package_imports() -> None:
    """The shared.logging package imports without error."""
    import shared.logging  # noqa: F401

    assert shared.logging.__all__


def test_public_api_imports() -> None:
    """Public API symbols are importable from shared.logging."""
    assert isinstance(logger, Logger)
    assert LogLevel.INFO == "INFO"
    assert LogModule.CONSULTATION == "consultation"
    assert issubclass(ConfigurationError, LoggingError)


def test_all_modules_import() -> None:
    """Every submodule imports independently."""
    for module_name in SUBMODULES:
        module = importlib.import_module(module_name)
        assert module is not None


def test_no_circular_imports() -> None:
    """All submodules import in sequence without circular dependency errors."""
    import shared.logging  # noqa: F401

    for module_name in SUBMODULES:
        importlib.import_module(module_name)


@pytest.mark.parametrize(
    "method_name",
    [
        "debug",
        "info",
        "warning",
        "error",
        "critical",
        "exception",
        "audit",
        "performance",
    ],
)
def test_logger_methods_exist(method_name: str) -> None:
    """Logger exposes all required public methods."""
    assert hasattr(logger, method_name)
    assert callable(getattr(logger, method_name))


def test_log_context_dataclass() -> None:
    """LogContext is a frozen dataclass with optional fields."""
    context = LogContext(correlation_id="abc-123")
    assert context.correlation_id == "abc-123"
    assert context.request_id is None


def test_enums_exported() -> None:
    """Environment and status enums are available."""
    assert Environment.PRODUCTION == "production"
    assert LogStatus.SUCCESS == "SUCCESS"


def test_logger_info_succeeds() -> None:
    """Info logging is functional after Milestone 2."""
    test_logger = Logger()
    test_logger.info(
        "test message",
        module=LogModule.API,
        action=ACTION_CONSULTATION_STARTED,
    )
