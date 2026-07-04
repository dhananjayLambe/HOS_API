"""Unit tests for CorrelationMiddleware."""

from __future__ import annotations

from uuid import uuid4

from django.http import HttpResponse
from django.test import RequestFactory

from shared.logging.constants import (
    CORRELATION_ID_HTTP_HEADER,
    REQUEST_ID_HTTP_HEADER,
)
from shared.logging.context import get_context_manager
from shared.logging.correlation import generate_correlation_id, is_valid_correlation_id
from shared.logging.middleware import CorrelationMiddleware


def _middleware() -> CorrelationMiddleware:
    return CorrelationMiddleware(lambda request: HttpResponse("ok"))


def test_generates_correlation_and_request_ids() -> None:
    request = RequestFactory().get("/api/bookings/")
    response = _middleware()(request)

    assert is_valid_correlation_id(response[CORRELATION_ID_HTTP_HEADER])
    assert is_valid_correlation_id(response[REQUEST_ID_HTTP_HEADER])
    assert request.correlation_id == response[CORRELATION_ID_HTTP_HEADER]
    assert request.request_id == response[REQUEST_ID_HTTP_HEADER]
    assert get_context_manager().get().correlation_id is None


def test_reuses_valid_incoming_correlation_id() -> None:
    correlation_id = generate_correlation_id().to_string()
    request = RequestFactory().get(
        "/api/bookings/",
        HTTP_X_CORRELATION_ID=correlation_id,
    )
    response = _middleware()(request)

    assert response[CORRELATION_ID_HTTP_HEADER] == correlation_id
    assert response[REQUEST_ID_HTTP_HEADER] != correlation_id


def test_rejects_invalid_incoming_correlation_id() -> None:
    request = RequestFactory().get(
        "/api/bookings/",
        HTTP_X_CORRELATION_ID="not-a-uuid",
    )
    response = _middleware()(request)

    assert is_valid_correlation_id(response[CORRELATION_ID_HTTP_HEADER])
    assert response[CORRELATION_ID_HTTP_HEADER] != "not-a-uuid"


def test_context_available_during_request() -> None:
    seen: dict[str, str | None] = {}

    def view(request):
        context = get_context_manager().get()
        seen["correlation_id"] = context.correlation_id
        seen["request_id"] = context.request_id
        return HttpResponse("ok")

    request = RequestFactory().get("/api/bookings/")
    CorrelationMiddleware(view)(request)

    assert is_valid_correlation_id(seen["correlation_id"])
    assert is_valid_correlation_id(seen["request_id"])
    assert get_context_manager().get().correlation_id is None


def test_each_request_gets_unique_request_id() -> None:
    correlation_id = str(uuid4())
    middleware = _middleware()
    first = middleware(
        RequestFactory().get("/a/", HTTP_X_CORRELATION_ID=correlation_id)
    )
    second = middleware(
        RequestFactory().get("/b/", HTTP_X_CORRELATION_ID=correlation_id)
    )

    assert first[CORRELATION_ID_HTTP_HEADER] == second[CORRELATION_ID_HTTP_HEADER]
    assert first[REQUEST_ID_HTTP_HEADER] != second[REQUEST_ID_HTTP_HEADER]
