"""Log dispatch pipeline for the DoctorProCare logging platform.

Purpose:
    Route validated LogRecord instances to configured output handlers.

Responsibility:
    Dispatch records to handlers and swallow output failures so logging never
    interrupts application workflows.

Future implementation:
    Context enrichment and formatter integration will be inserted before
    handler dispatch in later milestones.
"""

from __future__ import annotations

from shared.logging.exceptions import HandlerError
from shared.logging.handlers import BaseLogHandler, ConsoleLogHandler
from shared.logging.record import LogRecord


class LogDispatcher:
    """Routes LogRecord instances to one or more output handlers."""

    def __init__(self, handlers: list[BaseLogHandler] | None = None) -> None:
        """Initialize the dispatcher with output handlers.

        Args:
            handlers: Handler instances to receive log records.
                Defaults to a single ConsoleLogHandler.
        """
        self._handlers: list[BaseLogHandler] = handlers or [ConsoleLogHandler()]

    def dispatch(self, record: LogRecord) -> None:
        """Dispatch a log record to all registered handlers.

        Output failures are swallowed so application workflows are never
        interrupted by logging errors.

        Args:
            record: Validated immutable log record.
        """
        for handler in self._handlers:
            try:
                handler.emit_record(record)
            except (HandlerError, OSError, NotImplementedError):
                continue

    def flush(self) -> None:
        """Flush all registered handlers."""
        for handler in self._handlers:
            try:
                handler.flush()
            except (HandlerError, OSError, NotImplementedError):
                continue

    def close(self) -> None:
        """Close all registered handlers."""
        for handler in self._handlers:
            try:
                handler.close()
            except (HandlerError, OSError, NotImplementedError):
                continue


_default_dispatcher = LogDispatcher()


def dispatch(record: LogRecord) -> None:
    """Dispatch a log record using the default dispatcher.

    Args:
        record: Validated immutable log record.
    """
    _default_dispatcher.dispatch(record)


def get_default_dispatcher() -> LogDispatcher:
    """Return the module-level default dispatcher instance."""
    return _default_dispatcher
