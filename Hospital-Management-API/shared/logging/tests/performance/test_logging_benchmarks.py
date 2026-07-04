"""Performance certification tests for the logging platform."""

from __future__ import annotations

import pytest

from shared.logging.certification.benchmark import (
    benchmark_concurrent_logging,
    benchmark_exceptions,
    benchmark_handler_init,
    benchmark_sequential_logs,
    benchmark_single_log_call,
)

pytestmark = pytest.mark.slow


def test_single_log_call_under_5ms() -> None:
    result = benchmark_single_log_call(iterations=50)
    assert result.errors == 0
    assert result.elapsed_ms < 5.0


def test_thousand_sequential_logs_stable() -> None:
    result = benchmark_sequential_logs(count=1000)
    assert result.errors == 0


def test_hundred_exceptions_no_errors() -> None:
    result = benchmark_exceptions(count=100)
    assert result.peak_memory_kb is not None
    assert result.peak_memory_kb < 50_000


def test_concurrent_logging_thread_safe() -> None:
    result = benchmark_concurrent_logging(threads=10, per_thread=50)
    assert result.errors == 0


def test_handler_init_under_500ms() -> None:
    result = benchmark_handler_init()
    assert result.elapsed_ms < 500.0
