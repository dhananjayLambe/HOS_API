"""Unit tests for shared.logging.handlers.ConsoleLogHandler."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from shared.logging import Logger, LogModule
from shared.logging.constants import (
    ACTION_CONSULTATION_STARTED,
    LogLevel,
    LogStatus,
)
from shared.logging.dispatcher import LogDispatcher
from shared.logging.exceptions import FormatterError, HandlerError
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import ConsoleLogHandler
from shared.logging.record import build_record


def _sample_record():
    return build_record(
        level=LogLevel.INFO,
        module=LogModule.CONSULTATION,
        action=ACTION_CONSULTATION_STARTED,
        message="Consultation started successfully",
        status=LogStatus.SUCCESS,
        timestamp=datetime(2026, 7, 1, 12, 45, 21, 123456, tzinfo=timezone.utc),
    )


def test_console_uses_formatter(capsys) -> None:
    handler = ConsoleLogHandler(formatter=JSONLogFormatter(pretty=False))
    handler.emit_record(_sample_record())
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["level"] == "INFO"
    assert payload["action"] == ACTION_CONSULTATION_STARTED
    assert payload["message"] == "Consultation started successfully"


def test_pretty_output(capsys) -> None:
    handler = ConsoleLogHandler(formatter=JSONLogFormatter(pretty=True))
    handler.emit_record(_sample_record())
    output = capsys.readouterr().out
    assert "\n" in output
    json.loads(output.strip())


def test_compact_output(capsys) -> None:
    handler = ConsoleLogHandler(formatter=JSONLogFormatter(pretty=False))
    handler.emit_record(_sample_record())
    output = capsys.readouterr().out.strip()
    assert "\n" not in output
    json.loads(output)


def test_formatter_error_wrapped_as_handler_error() -> None:
    failing_formatter = MagicMock(spec=JSONLogFormatter)
    failing_formatter.format.side_effect = FormatterError("serialization failed")
    handler = ConsoleLogHandler(formatter=failing_formatter)

    with pytest.raises(HandlerError, match="serialization failed"):
        handler.emit_record(_sample_record())


def test_end_to_end_via_logger(capsys) -> None:
    console_logger = Logger(
        dispatcher=LogDispatcher(
            handlers=[ConsoleLogHandler(formatter=JSONLogFormatter(pretty=False))]
        )
    )
    console_logger.info(
        "Consultation started successfully",
        module=LogModule.CONSULTATION,
        action=ACTION_CONSULTATION_STARTED,
    )
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["schema_version"] == 1
    assert payload["level"] == "INFO"


def test_flush_and_close_are_safe_noops() -> None:
    handler = ConsoleLogHandler()
    handler.flush()
    handler.close()
