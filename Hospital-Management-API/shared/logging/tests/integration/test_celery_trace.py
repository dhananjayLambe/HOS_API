"""Layer 4 certification: Celery correlation continuity."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from django.test import override_settings

import main.celery  # noqa: F401
from shared.logging.context import LogContext, get_context_manager
from shared.logging.correlation import generate_correlation_id
from shared.logging.tests import workflow
from shared.logging.tests.trace_harness import TraceCapture

pytestmark = pytest.mark.integration


def test_celery_worker_logs_preserve_correlation_id() -> None:
    capture = TraceCapture()
    correlation_id = generate_correlation_id().to_string()
    manager = get_context_manager()
    manager.set(
        LogContext(
            correlation_id=correlation_id,
            request_id=generate_correlation_id().to_string(),
            booking_id="BK-CELERY-TRACE",
        )
    )
    try:
        with patch("shared.logging.logger", capture.logger):
            result = workflow.notification_pipeline_task.delay().get()
    finally:
        manager.clear()

    assert result["correlation_id"] == correlation_id
    capture.assert_all_have_correlation_id()
    capture.assert_single_correlation_id(correlation_id)
    assert "celery.task_started" in capture.actions()
    assert "whatsapp.notification_sent" in capture.actions()
    assert "report.upload_completed" in capture.actions()


@override_settings(CELERY_TASK_EAGER_PROPAGATES=False)
def test_celery_retry_preserves_correlation_id() -> None:
    capture = TraceCapture()
    correlation_id = generate_correlation_id().to_string()
    workflow.fail_once_then_succeed_task._attempts = 0
    manager = get_context_manager()
    manager.set(
        LogContext(
            correlation_id=correlation_id,
            request_id=generate_correlation_id().to_string(),
        )
    )
    try:
        with patch("shared.logging.logger", capture.logger):
            result = workflow.fail_once_then_succeed_task.delay().get()
    finally:
        manager.clear()
        workflow.fail_once_then_succeed_task._attempts = 0

    assert result["correlation_id"] == correlation_id
    capture.assert_single_correlation_id(correlation_id)
    assert get_context_manager().get().correlation_id is None


def test_failed_celery_task_preserves_correlation_in_logs() -> None:
    capture = TraceCapture()
    correlation_id = generate_correlation_id().to_string()
    manager = get_context_manager()
    manager.set(
        LogContext(
            correlation_id=correlation_id,
            request_id=generate_correlation_id().to_string(),
        )
    )
    try:
        with patch("shared.logging.logger", capture.logger):
            with pytest.raises(RuntimeError):
                workflow.fail_with_log_task.delay().get()
    finally:
        manager.clear()

    capture.assert_single_correlation_id(correlation_id)
    assert get_context_manager().get().correlation_id is None
