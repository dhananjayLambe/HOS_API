"""Fail-open certification hooks."""

from __future__ import annotations

from collections.abc import Callable
from typing import TypeVar

from shared.logging import LogModule, logger

T = TypeVar("T")


def fail_open_certification(action: str, fn: Callable[[], T], *, default: T) -> T:
    try:
        return fn()
    except Exception as exc:
        logger.exception(
            "Certification failed",
            module=LogModule.MONITORING,
            action="support_trace.certification.failed",
            metadata={"hook_action": action, "error": str(exc)},
        )
        return default
