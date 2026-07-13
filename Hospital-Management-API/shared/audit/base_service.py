"""Shared fail-open service orchestration for audit frameworks."""

from __future__ import annotations

import logging
import uuid
from typing import Any, Callable, TypeVar

from shared.audit.exceptions import AuditError
from shared.audit.types import BaseAuditRecordResult

TResult = TypeVar("TResult", bound=BaseAuditRecordResult)
TError = TypeVar("TError", bound=AuditError)

logger = logging.getLogger(__name__)


class BaseAuditService:
    """Template for validate → build → save with fail-open error handling."""

    audit_logger_name: str = "audit_record_failed"

    @classmethod
    def _record_fail_open(
        cls,
        *,
        correlation_id: str | None,
        action: Any,
        resource_type: Any,
        resource_id: str,
        error_base: type[TError],
        record_fn: Callable[[], TResult],
        raise_on_failure: bool = False,
        log_extra: dict[str, Any] | None = None,
    ) -> TResult:
        correlation_for_log = correlation_id or ""
        try:
            return record_fn()
        except error_base as exc:
            correlation_for_log = correlation_for_log or str(uuid.uuid4())
            extra = {
                "correlation_id": correlation_for_log,
                "error_type": type(exc).__name__,
                "error": str(exc),
                "action": str(action),
                "resource_type": str(resource_type),
                "resource_id": str(resource_id),
            }
            if log_extra:
                extra.update(log_extra)
            logger.warning(cls.audit_logger_name, extra=extra, exc_info=True)
            if raise_on_failure:
                raise
            return cls._failure_result(
                correlation_id=correlation_for_log,
                error=str(exc),
                error_type=type(exc).__name__,
            )

    @staticmethod
    def _failure_result(
        *,
        correlation_id: str,
        error: str,
        error_type: str,
    ) -> BaseAuditRecordResult:
        return BaseAuditRecordResult(
            success=False,
            correlation_id=correlation_id,
            error=error,
            error_type=error_type,
        )
