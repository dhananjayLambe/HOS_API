"""Integration tests for Celery LogContext propagation."""

from __future__ import annotations

import json
from unittest.mock import patch
from uuid import uuid4

import pytest
from celery import chain, group
from django.test import override_settings

import main.celery  # noqa: F401 — register signals on the Celery app
from shared.logging.context import LogContext, get_context_manager
from shared.logging.dispatcher import LogDispatcher
from shared.logging.formatter import JSONLogFormatter
from shared.logging.handlers import ConsoleLogHandler
from shared.logging.logger import Logger
from shared.logging.tests import celery_tasks

pytestmark = pytest.mark.integration


@pytest.fixture
def correlation_context() -> LogContext:
    return LogContext(
        correlation_id=str(uuid4()),
        request_id=str(uuid4()),
        booking_id="BK-CELERY",
    )


def test_basic_propagation_preserves_correlation_id(correlation_context) -> None:
    manager = get_context_manager()
    manager.set(correlation_context)
    try:
        result = celery_tasks.capture_context_task.delay().get()
    finally:
        manager.clear()

    assert result["correlation_id"] == correlation_context.correlation_id
    assert result["request_id"] == correlation_context.request_id
    assert result["booking_id"] == correlation_context.booking_id


def test_nested_task_inherits_correlation_id(correlation_context) -> None:
    manager = get_context_manager()
    manager.set(correlation_context)
    try:
        result = celery_tasks.nested_context_task.delay().get()
    finally:
        manager.clear()

    assert result["parent"]["correlation_id"] == correlation_context.correlation_id
    assert result["child"]["correlation_id"] == correlation_context.correlation_id


@override_settings(CELERY_TASK_EAGER_PROPAGATES=False)
def test_retry_restores_context(correlation_context) -> None:
    celery_tasks._retry_attempts = 0
    manager = get_context_manager()
    manager.set(correlation_context)
    try:
        result = celery_tasks.fail_task.delay().get()
    finally:
        manager.clear()
        celery_tasks._retry_attempts = 0

    assert result["correlation_id"] == correlation_context.correlation_id
    assert get_context_manager().get().correlation_id is None


def test_chain_propagates_context(correlation_context) -> None:
    manager = get_context_manager()
    manager.set(correlation_context)
    try:
        workflow = chain(
            celery_tasks.capture_context_chained_task.s(),
            celery_tasks.capture_context_chained_task.s(),
        )
        async_result = workflow.apply()
        second = async_result.get()
        first = async_result.parent.get()
    finally:
        manager.clear()

    assert first["correlation_id"] == correlation_context.correlation_id
    assert second["correlation_id"] == correlation_context.correlation_id


def test_group_propagates_context(correlation_context) -> None:
    manager = get_context_manager()
    manager.set(correlation_context)
    try:
        results = group(
            celery_tasks.capture_context_task.s(),
            celery_tasks.capture_context_task.s(),
        ).apply().get()
    finally:
        manager.clear()

    assert len(results) == 2
    assert all(item["correlation_id"] == correlation_context.correlation_id for item in results)


def test_failure_clears_context_and_subsequent_task_has_no_leak(
    correlation_context,
) -> None:
    manager = get_context_manager()
    manager.set(correlation_context)
    try:
        with pytest.raises(RuntimeError):
            celery_tasks.fail_permanently_task.delay().get()
    finally:
        manager.clear()

    assert get_context_manager().get().correlation_id is None

    snapshot = celery_tasks.capture_after_failure_task.delay().get()
    assert snapshot["correlation_id"] is None


def test_task_without_context_header_succeeds() -> None:
    snapshot = celery_tasks.capture_context_task.delay().get()
    assert snapshot["correlation_id"] is None


def test_logger_inside_task_includes_context(capsys, correlation_context) -> None:
    manager = get_context_manager()
    manager.set(correlation_context)
    test_logger = Logger(
        dispatcher=LogDispatcher(
            handlers=[ConsoleLogHandler(JSONLogFormatter(pretty=False))]
        )
    )
    with patch("shared.logging.logger.logger", test_logger):
        celery_tasks.log_context_task.delay().get()
    manager.clear()

    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["correlation_id"] == correlation_context.correlation_id
    assert payload["module"] == "celery"


def test_context_cleared_after_task_completion(correlation_context) -> None:
    manager = get_context_manager()
    manager.set(correlation_context)
    try:
        celery_tasks.capture_context_task.delay().get()
    finally:
        manager.clear()

    assert get_context_manager().get().correlation_id is None
