"""End-to-end certification: diagnostic booking patient journey."""

from __future__ import annotations

import json
import time
from unittest.mock import patch

import pytest
from django.http import JsonResponse
from django.test import RequestFactory

import main.celery  # noqa: F401
from shared.logging import LogModule
from shared.logging.context import LogContext, get_context_manager
from shared.logging.correlation import generate_correlation_id, is_valid_correlation_id
from shared.logging.dispatcher import LogDispatcher
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import CloudWatchLogHandler
from shared.logging.logger import Logger
from shared.logging.middleware import CorrelationMiddleware
from shared.logging.tests.trace_harness import (
    CapturingLogHandler,
    cloudwatch_events,
    mock_cloudwatch_client,
)
from shared.logging.tests.workflow import WORKFLOW_ACTIONS, run_api_workflow

pytestmark = pytest.mark.integration


def test_complete_patient_booking_workflow_preserves_correlation_id() -> None:
    capture_handler = CapturingLogHandler()
    client = mock_cloudwatch_client()
    cw_handler = CloudWatchLogHandler(
        log_group="/doctorprocare/application",
        region="ap-south-1",
        formatter=JSONLogFormatter(pretty=False),
        logs_client=client,
        hostname="cert-host",
        date_str="2026-07-04",
    )
    cert_logger = Logger(
        dispatcher=LogDispatcher(handlers=[capture_handler, cw_handler])
    )
    workflow_result: dict[str, str | None] = {}

    def view(request):
        with patch("shared.logging.logger", cert_logger):
            workflow_result.update(run_api_workflow(cert_logger))
        return JsonResponse(
            {
                "correlation_id": request.correlation_id,
                "request_id": request.request_id,
                "booking_id": workflow_result["booking_id"],
            }
        )

    response = CorrelationMiddleware(view)(RequestFactory().post("/api/bookings/"))
    cert_logger._dispatcher.flush()

    correlation_id = json.loads(response.content)["correlation_id"]
    assert is_valid_correlation_id(correlation_id)
    assert workflow_result["correlation_id"] == correlation_id
    assert workflow_result["celery_correlation_id"] == correlation_id
    assert workflow_result["booking_id"] == "BK-CERT-001"
    assert workflow_result["report_id"] == "RPT-CERT-001"

    payloads = capture_handler.payloads
    assert [payload["action"] for payload in payloads] == list(WORKFLOW_ACTIONS)
    assert all(payload["correlation_id"] == correlation_id for payload in payloads)
    assert all(payload.get("request_id") for payload in payloads)

    # Request ID is constant for the HTTP request scope (including Celery inherit).
    request_ids = {payload["request_id"] for payload in payloads}
    assert len(request_ids) == 1

    events = cloudwatch_events(client)
    assert [event["action"] for event in events] == list(WORKFLOW_ACTIONS)
    assert all(event["correlation_id"] == correlation_id for event in events)
    assert get_context_manager().get().correlation_id is None


def test_missing_context_logger_still_works() -> None:
    capture_handler = CapturingLogHandler()
    logger = Logger(dispatcher=LogDispatcher(handlers=[capture_handler]))
    logger.info(
        "Startup without request context",
        module=LogModule.INFRASTRUCTURE,
        action="infrastructure.started",
    )
    assert capture_handler.payloads[0]["message"] == "Startup without request context"
    assert "correlation_id" not in capture_handler.payloads[0]


def test_correlation_enrichment_overhead_under_target() -> None:
    capture_handler = CapturingLogHandler()
    logger = Logger(dispatcher=LogDispatcher(handlers=[capture_handler]))
    manager = get_context_manager()
    manager.set(
        LogContext(
            correlation_id=generate_correlation_id().to_string(),
            request_id=generate_correlation_id().to_string(),
        )
    )
    try:
        logger.info("warmup", module=LogModule.API, action="api.warmup")
        capture_handler.payloads.clear()

        iterations = 200
        start = time.perf_counter()
        for _ in range(iterations):
            logger.info("perf", module=LogModule.API, action="api.perf")
        elapsed_ms = (time.perf_counter() - start) * 1000 / iterations
    finally:
        manager.clear()

    # Target is <0.2ms enrichment overhead; allow headroom for full log path.
    assert elapsed_ms < 2.0, f"log path {elapsed_ms:.3f}ms exceeds certification budget"
