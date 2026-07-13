"""Fail-open hooks for incident reconstruction."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import TypeVar

logger = logging.getLogger(__name__)

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
        logger.warning(
            "incident_reconstruction_failed",
            extra={"action": action, "error": str(exc)},
            exc_info=True,
        )
        return default
