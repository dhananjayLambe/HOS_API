"""Negative / concurrency certification: no context leakage between requests."""

from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor, as_completed

import pytest
from django.http import JsonResponse
from django.test import RequestFactory

from shared.logging import LogModule
from shared.logging.context import get_context_manager
from shared.logging.correlation import generate_correlation_id
from shared.logging.middleware import CorrelationMiddleware
from shared.logging.tests.trace_harness import TraceCapture

pytestmark = pytest.mark.integration


def _handle_request(correlation_id: str) -> dict[str, str | None]:
    capture = TraceCapture()
    seen: dict[str, str | None] = {}

    def view(request):
        context = get_context_manager().get()
        seen["correlation_id"] = context.correlation_id
        seen["request_id"] = context.request_id
        capture.logger.info(
            "Concurrent request handled",
            module=LogModule.API,
            action="api.concurrent",
        )
        return JsonResponse(
            {
                "correlation_id": request.correlation_id,
                "request_id": request.request_id,
            }
        )

    request = RequestFactory().get(
        "/api/concurrent/",
        HTTP_X_CORRELATION_ID=correlation_id,
    )
    response = CorrelationMiddleware(view)(request)
    body = json.loads(response.content)
    assert body["correlation_id"] == correlation_id
    assert seen["correlation_id"] == correlation_id
    capture.assert_single_correlation_id(correlation_id)
    assert get_context_manager().get().correlation_id is None
    return {
        "correlation_id": body["correlation_id"],
        "request_id": body["request_id"],
        "log_correlation_id": capture.payloads[0]["correlation_id"],
    }


def test_concurrent_requests_do_not_leak_context() -> None:
    correlation_ids = [generate_correlation_id().to_string() for _ in range(12)]

    results: list[dict[str, str | None]] = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [
            executor.submit(_handle_request, correlation_id)
            for correlation_id in correlation_ids
        ]
        for future in as_completed(futures):
            results.append(future.result())

    assert len(results) == len(correlation_ids)
    result_correlation_ids = {item["correlation_id"] for item in results}
    assert result_correlation_ids == set(correlation_ids)
    assert all(
        item["correlation_id"] == item["log_correlation_id"] for item in results
    )
    request_ids = [item["request_id"] for item in results]
    assert len(request_ids) == len(set(request_ids))
    assert get_context_manager().get().correlation_id is None


def test_sequential_requests_get_distinct_request_ids() -> None:
    shared_correlation = generate_correlation_id().to_string()
    first = _handle_request(shared_correlation)
    second = _handle_request(shared_correlation)

    assert first["correlation_id"] == second["correlation_id"] == shared_correlation
    assert first["request_id"] != second["request_id"]
