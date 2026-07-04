"""Layer 1–2 certification: HTTP request and API log tracing."""

from __future__ import annotations

import json
import time

import pytest
from django.http import HttpResponse, JsonResponse
from django.test import RequestFactory

from shared.logging import LogModule
from shared.logging.constants import (
    CORRELATION_ID_HTTP_HEADER,
    REQUEST_ID_HTTP_HEADER,
)
from shared.logging.context import get_context_manager
from shared.logging.correlation import generate_correlation_id, is_valid_correlation_id
from shared.logging.middleware import CorrelationMiddleware
from shared.logging.tests.trace_harness import TraceCapture

pytestmark = pytest.mark.integration


def test_http_request_initializes_exactly_one_correlation_id() -> None:
    capture = TraceCapture()

    def view(request):
        capture.logger.info(
            "HTTP request received",
            module=LogModule.API,
            action="api.request_received",
        )
        return JsonResponse(
            {
                "correlation_id": request.correlation_id,
                "request_id": request.request_id,
            }
        )

    request = RequestFactory().get("/api/bookings/")
    response = CorrelationMiddleware(view)(request)
    body = json.loads(response.content)

    assert is_valid_correlation_id(body["correlation_id"])
    assert is_valid_correlation_id(body["request_id"])
    assert response[CORRELATION_ID_HTTP_HEADER] == body["correlation_id"]
    assert response[REQUEST_ID_HTTP_HEADER] == body["request_id"]
    capture.assert_single_correlation_id(body["correlation_id"])
    assert get_context_manager().get().correlation_id is None


def test_api_logs_include_correlation_and_request_ids() -> None:
    capture = TraceCapture()
    correlation_id = generate_correlation_id().to_string()

    def view(request):
        capture.logger.info(
            "Authentication verified",
            module=LogModule.AUTHENTICATION,
            action="authentication.verified",
        )
        capture.logger.info(
            "Booking submitted",
            module=LogModule.BOOKING,
            action="booking.submitted",
        )
        return HttpResponse("ok")

    request = RequestFactory().get(
        "/api/bookings/",
        HTTP_X_CORRELATION_ID=correlation_id,
    )
    CorrelationMiddleware(view)(request)

    capture.assert_all_have_correlation_id()
    capture.assert_single_correlation_id(correlation_id)
    request_ids = capture.request_ids()
    assert len(request_ids) == 1
    assert None not in request_ids


def test_invalid_correlation_id_header_is_rejected() -> None:
    request = RequestFactory().get(
        "/api/bookings/",
        HTTP_X_CORRELATION_ID="invalid-id",
    )
    response = CorrelationMiddleware(lambda r: HttpResponse("ok"))(request)

    assert is_valid_correlation_id(response[CORRELATION_ID_HTTP_HEADER])
    assert response[CORRELATION_ID_HTTP_HEADER] != "invalid-id"


def test_context_cleared_after_http_response() -> None:
    seen_during: list[str | None] = []

    def view(request):
        seen_during.append(get_context_manager().get().correlation_id)
        return HttpResponse("ok")

    CorrelationMiddleware(view)(RequestFactory().get("/api/"))
    assert seen_during[0] is not None
    assert get_context_manager().get().correlation_id is None


def test_middleware_overhead_under_one_millisecond() -> None:
    middleware = CorrelationMiddleware(lambda request: HttpResponse("ok"))
    request = RequestFactory().get("/api/")

    start = time.perf_counter()
    for _ in range(200):
        middleware(request)
    elapsed_ms = (time.perf_counter() - start) * 1000 / 200

    assert elapsed_ms < 1.0, f"middleware overhead {elapsed_ms:.3f}ms exceeds 1ms"
