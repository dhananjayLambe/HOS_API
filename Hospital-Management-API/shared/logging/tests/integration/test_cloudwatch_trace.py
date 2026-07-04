"""Layer 6 / CloudWatch certification: searchable correlation traces."""

from __future__ import annotations

from unittest.mock import patch

import pytest

import main.celery  # noqa: F401
from shared.logging import LogModule
from shared.logging.context import LogContext, get_context_manager
from shared.logging.correlation import generate_correlation_id
from shared.logging.dispatcher import LogDispatcher
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import CloudWatchLogHandler
from shared.logging.logger import Logger
from shared.logging.tests import workflow
from shared.logging.tests.trace_harness import (
    CapturingLogHandler,
    cloudwatch_events,
    mock_cloudwatch_client,
)
from shared.logging.tests.workflow import WORKFLOW_ACTIONS

pytestmark = pytest.mark.integration


def test_cloudwatch_preserves_json_and_correlation_id() -> None:
    client = mock_cloudwatch_client()
    handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
        hostname="cert-host",
        date_str="2026-07-04",
    )
    logger = Logger(dispatcher=LogDispatcher(handlers=[handler]))
    correlation_id = generate_correlation_id().to_string()
    manager = get_context_manager()
    manager.set(
        LogContext(
            correlation_id=correlation_id,
            request_id=generate_correlation_id().to_string(),
            booking_id="BK-CW-001",
        )
    )
    try:
        logger.info(
            "Booking confirmed",
            module=LogModule.BOOKING,
            action="booking.confirmed",
        )
        logger._dispatcher.flush()
    finally:
        manager.clear()

    events = cloudwatch_events(client)
    assert len(events) == 1
    assert events[0]["correlation_id"] == correlation_id
    assert events[0]["booking_id"] == "BK-CW-001"
    assert events[0]["action"] == "booking.confirmed"


def test_cloudwatch_reconstructs_workflow_by_correlation_id() -> None:
    client = mock_cloudwatch_client()
    capture_handler = CapturingLogHandler()
    cw_handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
        hostname="cert-host",
        date_str="2026-07-04",
    )
    dual_logger = Logger(
        dispatcher=LogDispatcher(handlers=[capture_handler, cw_handler])
    )
    correlation_id = generate_correlation_id().to_string()

    manager = get_context_manager()
    manager.set(
        LogContext(
            correlation_id=correlation_id,
            request_id=generate_correlation_id().to_string(),
        )
    )
    try:
        with patch("shared.logging.logger", dual_logger):
            result = workflow.run_api_workflow(dual_logger)
        dual_logger._dispatcher.flush()
    finally:
        manager.clear()

    events = cloudwatch_events(client)
    assert result["correlation_id"] == correlation_id
    assert all(event.get("correlation_id") == correlation_id for event in events)
    assert [event["action"] for event in events] == list(WORKFLOW_ACTIONS)

    searchable = [
        event for event in events if event.get("correlation_id") == correlation_id
    ]
    assert len(searchable) == len(WORKFLOW_ACTIONS)
    assert searchable[0]["action"] == "api.request_received"
    assert searchable[-1]["action"] == "workflow.completed"


def test_cloudwatch_exception_logs_are_searchable() -> None:
    client = mock_cloudwatch_client()
    handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
        hostname="cert-host",
        date_str="2026-07-04",
    )
    logger = Logger(dispatcher=LogDispatcher(handlers=[handler]))
    correlation_id = generate_correlation_id().to_string()
    manager = get_context_manager()
    manager.set(
        LogContext(
            correlation_id=correlation_id,
            request_id=generate_correlation_id().to_string(),
        )
    )
    try:
        try:
            raise ValueError("report validation failed")
        except ValueError as exc:
            logger.exception(
                "Report validation failed",
                module=LogModule.REPORTS,
                action="report.validation_failed",
                exc=exc,
            )
        logger._dispatcher.flush()
    finally:
        manager.clear()

    events = cloudwatch_events(client)
    assert len(events) == 1
    assert events[0]["correlation_id"] == correlation_id
    assert events[0]["level"] == "ERROR"
    assert "exception" in events[0]
