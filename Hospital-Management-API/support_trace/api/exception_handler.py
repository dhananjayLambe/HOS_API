"""Support API exception helpers."""

from __future__ import annotations

from shared.logging import LogModule, logger
from support_trace.api.error_codes import INVESTIGATION_FAILED, INVALID_IDENTIFIER, VALIDATION_ERROR
from support_trace.api.response_builder import SupportResponseBuilder


def handle_investigation_exception(exc: Exception, *, request, ctx):
    logger.exception(
        "Support API investigation failed",
        module=LogModule.API,
        action="support_trace.api.investigation_failed",
        metadata={"investigation_id": ctx.investigation_id, "error": str(exc)},
    )
    return SupportResponseBuilder.investigation_failed(
        "Investigation failed",
        request=request,
        ctx=ctx,
    )


def validation_error(message: str, *, request, ctx):
    return SupportResponseBuilder.error(
        message,
        code=VALIDATION_ERROR,
        status=400,
        request=request,
        ctx=ctx,
    )


def invalid_identifier(message: str, *, request, ctx):
    return SupportResponseBuilder.error(
        message,
        code=INVALID_IDENTIFIER,
        status=400,
        request=request,
        ctx=ctx,
    )
