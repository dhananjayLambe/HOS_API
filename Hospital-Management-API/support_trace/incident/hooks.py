"""Fail-open hooks for incident reconstruction."""

from __future__ import annotations

from collections.abc import Callable
from typing import TypeVar

from shared.logging import LogModule, logger

T = TypeVar("T")


def fail_open_reconstruction(
    action: str,
    fn: Callable[[], T],
    *,
    default: T,
) -> T:
    try:
        return fn()
    except Exception as exc:
        logger.exception(
            "Incident reconstruction failed",
            module=LogModule.MONITORING,
            action="support_trace.incident.reconstruction_failed",
            metadata={"hook_action": action, "error": str(exc)},
        )
        return default
