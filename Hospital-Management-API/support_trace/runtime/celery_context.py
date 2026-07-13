"""Celery task runtime context."""

from __future__ import annotations

import socket
from typing import Any


class CeleryContextResolver:
    @classmethod
    def resolve(cls, task_request: Any | None = None) -> dict[str, str | None]:
        req = task_request or cls._current_task_request()
        if req is None:
            return {}
        hostname = None
        try:
            hostname = socket.gethostname()
        except OSError:
            pass
        delivery = getattr(req, "delivery_info", None) or {}
        return {
            "celery_task_id": str(getattr(req, "id", "") or "") or None,
            "celery_queue": delivery.get("routing_key") or delivery.get("exchange"),
            "celery_worker": getattr(req, "hostname", None) or hostname,
        }

    @staticmethod
    def _current_task_request() -> Any | None:
        try:
            from celery import current_task

            task = current_task
            if task and getattr(task, "request", None):
                return task.request
        except ImportError:
            pass
        return None
