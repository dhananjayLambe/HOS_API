"""Unit tests for shared.logging.celery_context."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest
from celery.states import SUCCESS

from shared.logging.celery_context import (
    _clear_log_context_after_failure,
    _clear_log_context_after_postrun,
    _extract_log_context_payload,
    _inject_log_context_header,
    _pending_log_context_stamp,
    _restore_log_context,
    prepare_log_context_headers,
    register_celery_context_signals,
    reset_pending_log_context_stamp,
)
from shared.logging.constants import CELERY_LOG_CONTEXT_HEADER
from shared.logging.context import LogContext, get_context_manager
from shared.logging.context_serializer import serialize_log_context


def test_inject_header_when_context_active() -> None:
    manager = get_context_manager()
    manager.set(LogContext(correlation_id=str(uuid4()), booking_id="BK1"))
    headers: dict[str, object] = {}

    try:
        _inject_log_context_header(headers=headers)
        assert CELERY_LOG_CONTEXT_HEADER in headers
        assert headers[CELERY_LOG_CONTEXT_HEADER] == serialize_log_context(manager.get())
    finally:
        manager.clear()


def test_inject_header_skipped_when_context_empty() -> None:
    reset_pending_log_context_stamp()
    headers: dict[str, object] = {}
    _inject_log_context_header(headers=headers)
    assert headers == {}


def test_prepare_headers_uses_pending_stamp_for_eager_siblings() -> None:
    correlation_id = str(uuid4())
    reset_pending_log_context_stamp()
    pending = {"correlation_id": correlation_id}
    _pending_log_context_stamp.set(pending)
    headers = prepare_log_context_headers()
    assert headers[CELERY_LOG_CONTEXT_HEADER] == pending


def test_extract_payload_from_request_headers() -> None:
    payload = {"correlation_id": str(uuid4())}
    task = SimpleNamespace(
        request=SimpleNamespace(headers={CELERY_LOG_CONTEXT_HEADER: payload}, get=lambda _: None)
    )
    assert _extract_log_context_payload(task) == payload


def test_restore_and_clear_context_lifecycle() -> None:
    manager = get_context_manager()
    correlation_id = str(uuid4())
    task = SimpleNamespace(
        request=SimpleNamespace(
            headers={CELERY_LOG_CONTEXT_HEADER: {"correlation_id": correlation_id}},
            get=lambda key: None,
        )
    )

    _restore_log_context(task=task)
    assert manager.get().correlation_id == correlation_id

    _clear_log_context_after_postrun(state=SUCCESS, task=task)
    assert manager.get().correlation_id is None
    assert _pending_log_context_stamp.get() == {"correlation_id": correlation_id}

    _clear_log_context_after_failure()
    assert manager.get().correlation_id is None
    assert _pending_log_context_stamp.get() is None


def test_register_celery_context_signals_is_idempotent() -> None:
    register_celery_context_signals()
    register_celery_context_signals()
