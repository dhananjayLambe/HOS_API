"""Integration tests for automatic logger context enrichment."""

from __future__ import annotations

import json

from shared.logging import LogModule
from shared.logging.context import LogContext, get_context_manager
from shared.logging.dispatcher import LogDispatcher
from shared.logging.handlers import ConsoleLogHandler
from shared.logging.logger import Logger
from shared.logging.formatter import JSONLogFormatter


def test_multiple_logs_share_correlation_id_in_request_scope(capsys) -> None:
    manager = get_context_manager()
    manager.set(
        LogContext(
            correlation_id="550e8400-e29b-41d4-a716-446655440000",
            request_id="7f8a9b0c-1234-5678-9abc-def012345678",
            booking_id="BK123",
        )
    )
    try:
        logger_instance = Logger(
            dispatcher=LogDispatcher(
                handlers=[ConsoleLogHandler(JSONLogFormatter(pretty=False))]
            )
        )
        logger_instance.info(
            "Booking created",
            module=LogModule.BOOKING,
            action="booking.created",
        )
        logger_instance.info(
            "Booking confirmed",
            module=LogModule.BOOKING,
            action="booking.confirmed",
        )
    finally:
        manager.clear()

    lines = [line for line in capsys.readouterr().out.strip().split("\n") if line]
    assert len(lines) == 2

    first = json.loads(lines[0])
    second = json.loads(lines[1])

    assert first["correlation_id"] == second["correlation_id"]
    assert first["request_id"] == second["request_id"]
    assert first["booking_id"] == "BK123"
    assert first["message"] == "Booking created"
    assert second["message"] == "Booking confirmed"


def test_logger_works_without_active_context(capsys) -> None:
    logger_instance = Logger(
        dispatcher=LogDispatcher(
            handlers=[ConsoleLogHandler(JSONLogFormatter(pretty=False))]
        )
    )
    logger_instance.info(
        "Startup complete",
        module=LogModule.INFRASTRUCTURE,
        action="infrastructure.started",
    )

    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["message"] == "Startup complete"
    assert "correlation_id" not in payload
    assert "request_id" not in payload
