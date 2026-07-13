"""Fail-open hooks for identifier operations."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


def fail_open_identifier(
    action: str,
    fn: Callable[[], T],
    *,
    default: T,
) -> T:
    try:
        return fn()
    except Exception as exc:
        logger.warning(
            "identifier_operation_failed",
            extra={"action": action, "error": str(exc)},
            exc_info=True,
        )
        return default
