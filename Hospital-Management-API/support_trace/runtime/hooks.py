"""Fail-open hooks for runtime capture."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


def fail_open_runtime(action: str, fn: Callable[[], T], *, default: T) -> T:
    try:
        return fn()
    except Exception as exc:
        logger.warning(
            "runtime_capture_failed",
            extra={"action": action, "error": str(exc)},
            exc_info=True,
        )
        return default
