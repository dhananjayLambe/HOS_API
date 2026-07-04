"""Integration tests for exception logging pipeline."""

from __future__ import annotations

import json

import pytest

from shared.logging import Logger, LogModule
from shared.logging.context import LogContext, get_context_manager
from shared.logging.dispatcher import LogDispatcher
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import ConsoleLogHandler

pytestmark = pytest.mark.integration


def test_exception_pipeline_nested_object(capsys) -> None:
    logger = Logger(
        dispatcher=LogDispatcher(
            handlers=[ConsoleLogHandler(formatter=JSONLogFormatter(pretty=False))]
        )
    )
    manager = get_context_manager()
    manager.set(LogContext(booking_id="BK1"))
    try:
        raise ValueError("pipeline failure")
    except ValueError as exc:
        logger.exception(
            "Exception pipeline",
            module=LogModule.BOOKING,
            action="booking.create",
            exc=exc,
            duration_ms=50.0,
        )
    finally:
        manager.clear()

    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["exception"]["type"] == "ValueError"
    assert payload["duration_ms"] == 50.0
    assert "stack_trace" not in payload["metadata"]
    assert payload["booking_id"] == "BK1"
    assert payload["metadata"] == {}
