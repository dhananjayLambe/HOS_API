"""Structured operational events for diagnostic report workflows."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

from diagnostics_engine.monitoring.request_context import get_request_id
from shared.logging import LogModule, logger

EVENT_VERSION = 1

OUTCOME_SUCCESS = "SUCCESS"
OUTCOME_FAILED = "FAILED"
OUTCOME_STARTED = "STARTED"


def safe_emit(fn: Callable[..., Any], /, *args, **kwargs) -> None:
    """Run a side-effect emitter; never raise into clinical workflows."""
    try:
        fn(*args, **kwargs)
    except Exception:
        logger.exception(
            "Report safe emit failed",
            module=LogModule.REPORTS,
            action="diagnostics.reports.safe_emit_failed",
            metadata={"fn": getattr(fn, "__name__", repr(fn))},
        )


def emit_report_event(
    event: str,
    *,
    outcome: str,
    request_id: str | None = None,
    report_id=None,
    artifact_ids: list | None = None,
    assignment_id=None,
    branch_id=None,
    user_id=None,
    duration_ms: int | None = None,
    extra: dict | None = None,
) -> None:
    payload: dict[str, Any] = {
        "event_version": EVENT_VERSION,
        "event": event,
        "outcome": outcome,
        "request_id": request_id or get_request_id(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if report_id is not None:
        payload["report_id"] = str(report_id)
    if artifact_ids is not None:
        payload["artifact_ids"] = [str(a) for a in artifact_ids]
    if assignment_id is not None:
        payload["assignment_id"] = str(assignment_id)
    if branch_id is not None:
        payload["branch_id"] = str(branch_id)
    if user_id is not None:
        payload["user_id"] = str(user_id)
    if duration_ms is not None:
        payload["duration_ms"] = duration_ms
    if extra:
        payload.update(extra)

    try:
        logger.info(
            "Report event emitted",
            module=LogModule.REPORTS,
            action="diagnostics.reports.event",
            metadata={"payload": payload},
        )
    except Exception:
        logger.exception(
            "Report event log failed",
            module=LogModule.REPORTS,
            action="diagnostics.reports.event_log_failed",
            metadata={"event": event},
        )


def emit_report_metric(
    name: str,
    *,
    value: int | float = 1,
    tags: dict | None = None,
) -> None:
    """Phase 1: log-line metric placeholder for future exporters."""
    try:
        logger.info(
            "Report metric emitted",
            module=LogModule.REPORTS,
            action="diagnostics.reports.metric",
            metadata={
                "name": name,
                "value": value,
                "tags": tags or {},
            },
        )
    except Exception:
        logger.exception(
            "Report metric log failed",
            module=LogModule.REPORTS,
            action="diagnostics.reports.metric_failed",
            metadata={"name": name},
        )


def emit_order_state_changed(
    *,
    assignment_id,
    order_id,
    from_state: str,
    to_state: str,
    reason_code: str,
    reason_message: str,
) -> None:
    emit_report_event(
        "ORDER_STATE_CHANGED",
        outcome=OUTCOME_SUCCESS,
        assignment_id=assignment_id,
        extra={
            "order_id": str(order_id),
            "from_state": from_state,
            "to_state": to_state,
            "reason_code": reason_code,
            "reason_message": reason_message,
        },
    )
