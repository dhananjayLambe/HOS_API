"""Celery signal integration for LogContext propagation.

Purpose:
    Automatically serialize active context at task publish and restore it on
    the worker before task execution.

Responsibility:
    Orchestrate context_serializer and ContextManager only. No business logic.
"""

from __future__ import annotations

from contextvars import ContextVar
from typing import Any

from celery import Task
from celery.states import FAILURE, SUCCESS
from django.conf import settings

from shared.logging.constants import CELERY_LOG_CONTEXT_HEADER
from shared.logging.context import get_context_manager
from shared.logging.context_serializer import (
    deserialize_log_context,
    is_empty_log_context,
    serialize_log_context,
)

_signals_registered = False

_pending_log_context_stamp: ContextVar[dict[str, str] | None] = ContextVar(
    "doctorprocare_pending_log_context_stamp",
    default=None,
)


def reset_pending_log_context_stamp() -> None:
    """Clear the eager sibling stamp (test isolation and explicit resets)."""
    _pending_log_context_stamp.set(None)


def prepare_log_context_headers(
    headers: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return headers with serialized LogContext when propagation is possible."""
    merged = dict(headers or {})
    if CELERY_LOG_CONTEXT_HEADER in merged:
        return merged

    context = get_context_manager().get()
    if not is_empty_log_context(context):
        payload = serialize_log_context(context)
        merged[CELERY_LOG_CONTEXT_HEADER] = payload
        _pending_log_context_stamp.set(payload)
        return merged

    pending = _pending_log_context_stamp.get()
    if pending is not None:
        merged[CELERY_LOG_CONTEXT_HEADER] = pending
        return merged

    from celery import current_task

    task = current_task
    if task is None or not getattr(task, "request", None):
        return merged

    payload = _extract_log_context_payload(task)
    if payload is not None and isinstance(payload, dict):
        merged[CELERY_LOG_CONTEXT_HEADER] = payload
        _pending_log_context_stamp.set(payload)

    return merged


def _inject_log_context_header(headers: dict[str, Any] | None = None, **_: Any) -> None:
    """Attach serialized LogContext to Celery publish headers when present."""
    if headers is None:
        return

    stamped = prepare_log_context_headers(headers)
    headers.clear()
    headers.update(stamped)


def _extract_log_context_payload(task: Any) -> object | None:
    """Read propagated context from a Celery task request."""
    request = task.request
    headers = getattr(request, "headers", None) or {}
    if CELERY_LOG_CONTEXT_HEADER in headers:
        return headers[CELERY_LOG_CONTEXT_HEADER]

    if hasattr(request, "get"):
        return request.get(CELERY_LOG_CONTEXT_HEADER)

    return None


def _remember_stamp_from_payload(payload: object) -> None:
    if isinstance(payload, dict) and payload:
        _pending_log_context_stamp.set(payload)


def _restore_log_context(task: Any | None = None, **_: Any) -> None:
    """Restore LogContext from Celery headers before task execution."""
    if task is None:
        return

    payload = _extract_log_context_payload(task)
    if payload is None:
        return

    context = deserialize_log_context(payload)
    if is_empty_log_context(context):
        return

    get_context_manager().set(context)
    _remember_stamp_from_payload(payload)


def _is_celery_always_eager() -> bool:
    return bool(getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False))


def _clear_log_context_after_postrun(
    state: str | None = None,
    task: Any | None = None,
    **_: Any,
) -> None:
    """Clear worker context after task completion."""
    get_context_manager().clear()

    if state != SUCCESS:
        reset_pending_log_context_stamp()
        return

    if _is_celery_always_eager() and task is not None:
        _remember_stamp_from_payload(_extract_log_context_payload(task))
        return

    reset_pending_log_context_stamp()


def _clear_log_context_after_failure(**_: Any) -> None:
    """Clear worker context and pending stamp after unrecoverable failure."""
    get_context_manager().clear()
    reset_pending_log_context_stamp()


class LogContextPropagationTask(Task):
    """Stamp publish headers on apply paths (eager mode bypasses AMQP publish)."""

    def apply(
        self,
        args: tuple[Any, ...] | None = None,
        kwargs: dict[str, Any] | None = None,
        link: Any | None = None,
        link_error: Any | None = None,
        task_id: str | None = None,
        retries: int | None = None,
        throw: bool | None = None,
        logfile: Any | None = None,
        loglevel: Any | None = None,
        headers: dict[str, Any] | None = None,
        **options: Any,
    ) -> Any:
        stamped_headers = prepare_log_context_headers(headers)
        return super().apply(
            args,
            kwargs,
            link=link,
            link_error=link_error,
            task_id=task_id,
            retries=retries,
            throw=throw,
            logfile=logfile,
            loglevel=loglevel,
            headers=stamped_headers,
            **options,
        )

    def apply_async(
        self,
        args: tuple[Any, ...] | None = None,
        kwargs: dict[str, Any] | None = None,
        **options: Any,
    ) -> Any:
        stamped_headers = prepare_log_context_headers(options.get("headers"))
        options["headers"] = stamped_headers
        return super().apply_async(args, kwargs, **options)


def register_celery_context_signals() -> None:
    """Connect Celery signals for context propagation (idempotent)."""
    global _signals_registered
    if _signals_registered:
        return

    from celery.signals import (
        before_task_publish,
        task_failure,
        task_postrun,
        task_prerun,
    )

    before_task_publish.connect(_inject_log_context_header, weak=False)
    task_prerun.connect(_restore_log_context, weak=False)
    task_postrun.connect(_clear_log_context_after_postrun, weak=False)
    task_failure.connect(_clear_log_context_after_failure, weak=False)
    _signals_registered = True
