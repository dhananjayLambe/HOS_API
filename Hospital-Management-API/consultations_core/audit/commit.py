"""Defer audit emission until after successful transaction commit."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from django.db import transaction

from shared.logging.context import get_context_manager


def emit_after_commit(fn: Callable[..., Any], /, *args: Any, **kwargs: Any) -> None:
    """Schedule audit emit after commit, preserving active correlation context."""
    context = get_context_manager().get()
    if context.correlation_id and "correlation_id" not in kwargs:
        kwargs = {**kwargs, "correlation_id": context.correlation_id}
    transaction.on_commit(lambda: fn(*args, **kwargs))
