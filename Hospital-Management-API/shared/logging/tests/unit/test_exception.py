"""Unit tests for structured exception logging (M5)."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest

from shared.logging import Logger, LogModule
from shared.logging.context import LogContext, get_context_manager
from shared.logging.dispatcher import LogDispatcher
from shared.logging.exception_builder import capture_exception, validate_exception_metadata
from shared.logging.exceptions import HandlerError, LoggingError
from shared.logging.handlers import BaseLogHandler, ConsoleLogHandler


def _console_logger() -> Logger:
    return Logger(dispatcher=LogDispatcher(handlers=[ConsoleLogHandler()]))


def test_capture_exception_with_explicit_exc() -> None:
    try:
        raise ValueError("boom")
    except ValueError as exc:
        captured = capture_exception(exc=exc)

    assert captured.exception_type == "ValueError"
    assert captured.exception_message == "boom"
    assert "ValueError: boom" in captured.stack_trace
    assert captured.stack_trace.startswith("Traceback")


def test_capture_exception_from_active_except_block() -> None:
    try:
        raise RuntimeError("active")
    except RuntimeError:
        captured = capture_exception()

    assert captured.exception_type == "RuntimeError"
    assert captured.exception_message == "active"
    assert "RuntimeError: active" in captured.stack_trace


def test_capture_exception_raises_when_no_context() -> None:
    with pytest.raises(LoggingError, match="no active exception"):
        capture_exception()


def test_validate_exception_metadata_rejects_reserved_keys() -> None:
    with pytest.raises(LoggingError, match="stack_trace"):
        validate_exception_metadata({"stack_trace": "manual"})


def test_exception_with_exc_captures_type_message_stack_trace(capsys) -> None:
    console_logger = _console_logger()
    manager = get_context_manager()
    manager.set(LogContext(booking_id="BK123"))
    try:
        console_logger.exception(
            "Failed to create booking",
            module=LogModule.BOOKING,
            action="booking.create",
            exc=ValueError("duplicate key"),
        )
    finally:
        manager.clear()
    payload = json.loads(capsys.readouterr().out.strip())

    assert payload["level"] == "ERROR"
    assert payload["status"] == "FAILED"
    assert payload["metadata"] == {}
    assert payload["booking_id"] == "BK123"
    assert "stack_trace" not in payload["metadata"]
    assert payload["exception"]["type"] == "ValueError"
    assert payload["exception"]["message"] == "duplicate key"
    assert payload["exception"]["stack_trace"]
    assert "ValueError: duplicate key" in payload["exception"]["stack_trace"]


def test_exception_from_active_except_without_exc_arg(capsys) -> None:
    console_logger = _console_logger()
    try:
        raise KeyError("missing")
    except KeyError:
        console_logger.exception(
            "Lookup failed",
            module=LogModule.API,
            action="api.lookup",
        )

    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["exception"]["type"] == "KeyError"
    assert payload["exception"]["message"] == "'missing'"
    assert payload["exception"]["stack_trace"]


def test_exception_without_context_raises_logging_error() -> None:
    console_logger = _console_logger()
    with pytest.raises(LoggingError, match="no active exception"):
        console_logger.exception(
            "Nothing to log",
            module=LogModule.API,
            action="api.failed",
        )


def test_exception_includes_duration_ms(capsys) -> None:
    console_logger = _console_logger()
    console_logger.exception(
        "Query failed",
        module=LogModule.DATABASE,
        action="database.query",
        exc=RuntimeError("timeout"),
        duration_ms=842.7,
    )
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["duration_ms"] == 842.7


def test_exception_includes_error_code(capsys) -> None:
    console_logger = _console_logger()
    console_logger.exception(
        "Booking failed",
        module=LogModule.BOOKING,
        action="booking.create",
        exc=ValueError("invalid"),
        error_code="DP1001",
    )
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["event_code"] == "DP1001"


def test_exception_metadata_reserved_key_raises() -> None:
    console_logger = _console_logger()
    with pytest.raises(LoggingError, match="stack_trace"):
        console_logger.exception(
            "Bad metadata",
            module=LogModule.API,
            action="api.failed",
            exc=ValueError("x"),
            metadata={"stack_trace": "manual"},
        )


def test_exception_unsupported_metadata_raises() -> None:
    console_logger = _console_logger()

    class Model:
        pass

    with pytest.raises(LoggingError):
        console_logger.exception(
            "Bad metadata",
            module=LogModule.API,
            action="api.failed",
            exc=ValueError("x"),
            metadata={"model": Model()},
        )


def test_normal_info_log_has_no_exception_key(capsys) -> None:
    console_logger = _console_logger()
    console_logger.info(
        "ok",
        module=LogModule.API,
        action="api.request",
    )
    payload = json.loads(capsys.readouterr().out.strip())
    assert "exception" not in payload
    assert "duration_ms" not in payload


def test_exception_handler_failure_does_not_raise() -> None:
    failing_handler = MagicMock(spec=BaseLogHandler)
    failing_handler.emit_record.side_effect = HandlerError("output failed")
    resilient_logger = Logger(dispatcher=LogDispatcher(handlers=[failing_handler]))

    resilient_logger.exception(
        "Still safe",
        module=LogModule.API,
        action="api.failed",
        exc=ValueError("x"),
    )
