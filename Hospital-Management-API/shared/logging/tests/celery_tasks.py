"""Test-only Celery tasks for logging context propagation integration tests."""

from __future__ import annotations

from celery import shared_task

from shared.logging import LogModule
from shared.logging.context import get_context_manager


def _context_snapshot() -> dict[str, str | None]:
    context = get_context_manager().get()
    return {
        "correlation_id": context.correlation_id,
        "request_id": context.request_id,
        "booking_id": context.booking_id,
    }


@shared_task(name="logging_tests.capture_context")
def capture_context_task() -> dict[str, str | None]:
    """Return active context field snapshot."""
    return _context_snapshot()


@shared_task(name="logging_tests.log_context")
def log_context_task() -> None:
    """Emit a structured log line from inside a Celery task."""
    from shared.logging import logger

    logger.info(
        "Celery task executed",
        module=LogModule.CELERY,
        action="celery.executed",
    )


@shared_task(name="logging_tests.capture_context_chained")
def capture_context_chained_task(_previous: object | None = None) -> dict[str, str | None]:
    """Return context snapshot; accepts chain predecessor result."""
    return _context_snapshot()


@shared_task(name="logging_tests.nested_context")
def nested_context_task() -> dict[str, dict[str, str | None]]:
    """Enqueue a child task and return both context snapshots."""
    parent = _context_snapshot()
    child_result = capture_context_task.delay()
    return {"parent": parent, "child": child_result.result}


_retry_attempts = 0


@shared_task(
    name="logging_tests.fail_task",
    bind=True,
    autoretry_for=(ValueError,),
    retry_kwargs={"max_retries": 1, "countdown": 0},
)
def fail_task(self) -> dict[str, str | None]:
    """Fail once, then return context snapshot on retry."""
    global _retry_attempts
    _retry_attempts += 1
    if _retry_attempts == 1:
        raise ValueError("retry once")
    return _context_snapshot()


@shared_task(name="logging_tests.fail_permanently")
def fail_permanently_task() -> None:
    """Always fail to exercise failure cleanup."""
    raise RuntimeError("permanent failure")


@shared_task(name="logging_tests.capture_after_failure")
def capture_after_failure_task() -> dict[str, str | None]:
    """Capture context after a prior failure should have cleared worker state."""
    return _context_snapshot()
