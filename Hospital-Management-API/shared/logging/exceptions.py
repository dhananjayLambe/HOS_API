"""Standard logging exception hierarchy for the DoctorProCare logging platform.

Purpose:
    Define typed exceptions for configuration, formatting, handling, and context
    errors across the shared logging package.

Responsibility:
    Provide a stable base exception hierarchy with no internal dependencies.

Future implementation:
    Raised by config loaders, formatters, handlers, and context managers when
    operational failures occur. Logging failures must never interrupt workflows.
"""


class LoggingError(Exception):
    """Base exception for all shared logging errors."""


class ConfigurationError(LoggingError):
    """Raised when logging configuration is invalid or cannot be loaded."""


class FormatterError(LoggingError):
    """Raised when log record formatting fails."""


class HandlerError(LoggingError):
    """Raised when a log handler fails to emit, flush, or close."""


class ContextError(LoggingError):
    """Raised when execution context cannot be read or updated."""
