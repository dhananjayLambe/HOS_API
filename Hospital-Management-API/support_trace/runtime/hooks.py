"""Fail-open hooks for runtime capture."""

from __future__ import annotations

from collections.abc import Callable
from typing import TypeVar

from shared.logging import LogModule, logger

T = TypeVar("T")


def fail_open_runtime(action: str, fn: Callable[[], T], *, default: T) -> T:
    try:
        return fn()
    except Exception as exc:
        logger.exception(
            "Runtime capture failed",
            module=LogModule.MONITORING,
            action="support_trace.runtime.capture_failed",
            metadata={"hook_action": action, "error": str(exc)},
        )
        return default
