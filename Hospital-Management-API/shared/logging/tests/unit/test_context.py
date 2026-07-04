"""Unit tests for shared.logging.context."""

from __future__ import annotations

from shared.logging.context import LogContext, get_context_manager


def test_get_returns_empty_context_when_unset() -> None:
    manager = get_context_manager()
    manager.clear()

    context = manager.get()

    assert context.correlation_id is None
    assert context.request_id is None


def test_set_get_and_clear() -> None:
    manager = get_context_manager()
    manager.set(LogContext(correlation_id="corr-1", request_id="req-1"))

    assert manager.get().correlation_id == "corr-1"

    manager.clear()
    assert manager.get().correlation_id is None


def test_update_merges_into_active_context() -> None:
    manager = get_context_manager()
    manager.set(LogContext(correlation_id="corr-1"))
    manager.update(booking_id="BK123")

    context = manager.get()
    assert context.correlation_id == "corr-1"
    assert context.booking_id == "BK123"


def test_update_creates_context_when_unset() -> None:
    manager = get_context_manager()
    manager.clear()
    manager.update(consultation_id="CONS1")

    assert manager.get().consultation_id == "CONS1"
