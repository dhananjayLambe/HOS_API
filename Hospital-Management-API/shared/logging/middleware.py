"""Django middleware for Correlation ID and Request ID lifecycle.

Purpose:
    Initialize request-scoped LogContext on every HTTP request and clear it
    after the response is produced.

Responsibility:
    Orchestrate CorrelationId and ContextManager only. No field logic inline.
"""

from __future__ import annotations

from typing import Any, Callable
from uuid import uuid4

from shared.logging.constants import (
    CORRELATION_ID_HTTP_HEADER,
    REQUEST_ID_HTTP_HEADER,
)
from shared.logging.context import LogContext, get_context_manager
from shared.logging.correlation import (
    generate_correlation_id,
    is_valid_correlation_id,
    parse_correlation_id,
)


class CorrelationMiddleware:
    """Thin lifecycle orchestrator for per-request correlation context.

    Business code must never create Correlation IDs. This middleware is the
    sole HTTP entry point for generating or accepting them.
    """

    def __init__(self, get_response: Callable[[Any], Any]) -> None:
        self.get_response = get_response

    def __call__(self, request: Any) -> Any:
        manager = get_context_manager()
        try:
            correlation_id = self._resolve_correlation_id(request)
            request_id = str(uuid4())
            manager.set(
                LogContext(
                    correlation_id=correlation_id,
                    request_id=request_id,
                )
            )
            request.correlation_id = correlation_id
            request.request_id = request_id

            response = self.get_response(request)
            response[CORRELATION_ID_HTTP_HEADER] = correlation_id
            response[REQUEST_ID_HTTP_HEADER] = request_id
            return response
        finally:
            manager.clear()

    def _resolve_correlation_id(self, request: Any) -> str:
        """Reuse a valid incoming Correlation ID or generate a new one."""
        headers = getattr(request, "headers", None)
        incoming = headers.get(CORRELATION_ID_HTTP_HEADER) if headers is not None else None
        if incoming and is_valid_correlation_id(incoming):
            return parse_correlation_id(incoming).to_string()
        return generate_correlation_id().to_string()
