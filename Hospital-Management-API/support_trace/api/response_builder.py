"""Support API response builder."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from rest_framework.response import Response

from support_trace.api.contracts.envelope import ApiEnvelope, ErrorResponse, InvestigationMetadata
from support_trace.api.error_codes import INVESTIGATION_FAILED, NOT_IMPLEMENTED, PERMISSION_DENIED, WORKFLOW_NOT_FOUND
from support_trace.api.serializers.v1.investigation import serialize_lookup_result, serialize_timeline_result
from support_trace.lookup.types import TraceLookupResult
from support_trace.timeline.types import TimelineResult


API_VERSION = "v1"


def get_request_id(request) -> str:
    if request is None:
        return str(uuid.uuid4())
    header = (request.META.get("HTTP_X_REQUEST_ID") or "").strip()
    if header:
        return header[:128]
    if not hasattr(request, "_support_api_request_id"):
        request._support_api_request_id = str(uuid.uuid4())
    return request._support_api_request_id


class SupportResponseBuilder:
    @classmethod
    def success(
        cls,
        data,
        *,
        request,
        ctx,
        result: TraceLookupResult | TimelineResult | None = None,
        partial: bool = False,
    ) -> Response:
        metadata = cls._metadata(ctx, result, partial=partial)
        envelope = ApiEnvelope(
            success=True,
            request_id=get_request_id(request),
            data=data,
            metadata=metadata,
        )
        return Response(cls._envelope_dict(envelope), status=200)

    @classmethod
    def lookup_success(
        cls, result: TraceLookupResult, *, request, ctx, inv_req=None
    ) -> Response:
        if result.primary_trace is None and result.identifier_lookup and not result.identifier_lookup.traces:
            return cls.error(
                "Workflow not found",
                code=WORKFLOW_NOT_FOUND,
                status=404,
                request=request,
                ctx=ctx,
            )
        data = serialize_lookup_result(result, ctx, inv_req=inv_req)
        partial = bool(result.timeline and len(result.timeline.events) >= ctx.masking_policy.max_timeline_events)
        return cls.success(data, request=request, ctx=ctx, result=result, partial=partial)

    @classmethod
    def timeline_success(cls, result: TimelineResult, *, request, ctx) -> Response:
        data = serialize_timeline_result(result)
        return cls.success(data, request=request, ctx=ctx, result=None, partial=False)

    @classmethod
    def error(
        cls,
        message: str,
        *,
        code: str,
        status: int,
        request,
        ctx=None,
    ) -> Response:
        metadata = None
        if ctx is not None:
            metadata = InvestigationMetadata(
                investigation_id=ctx.investigation_id,
                duration_ms=0.0,
                generated_at=datetime.now(timezone.utc),
                api_version=API_VERSION,
                investigation_level="",
                correlation_id=None,
                partial=False,
                scope="",
            )
        envelope = ApiEnvelope(
            success=False,
            request_id=get_request_id(request),
            data=None,
            metadata=metadata,
            error=ErrorResponse(code=code, message=message),
        )
        return Response(cls._envelope_dict(envelope), status=status)

    @classmethod
    def not_implemented(cls, message: str, *, request, ctx) -> Response:
        return cls.error(message, code=NOT_IMPLEMENTED, status=501, request=request, ctx=ctx)

    @classmethod
    def investigation_failed(cls, message: str, *, request, ctx) -> Response:
        return cls.error(message, code=INVESTIGATION_FAILED, status=500, request=request, ctx=ctx)

    @classmethod
    def permission_denied(cls, request, ctx) -> Response:
        return cls.error(
            "Permission denied",
            code=PERMISSION_DENIED,
            status=403,
            request=request,
            ctx=ctx,
        )

    @staticmethod
    def _metadata(ctx, result, *, partial: bool) -> InvestigationMetadata:
        duration = getattr(result, "duration_ms", 0.0) if result else 0.0
        scope = getattr(result, "scope", "") if result else ""
        level = str(getattr(result, "level", "Full")) if result else "Full"
        correlation_id = None
        if result and getattr(result, "primary_trace", None):
            correlation_id = getattr(result.primary_trace, "correlation_id", None)
        generated = getattr(result, "generated_at", None) if result else None
        return InvestigationMetadata(
            investigation_id=ctx.investigation_id,
            duration_ms=float(duration or 0.0),
            generated_at=generated or datetime.now(timezone.utc),
            api_version=API_VERSION,
            investigation_level=level,
            correlation_id=str(correlation_id) if correlation_id else None,
            partial=partial,
            scope=scope or "",
        )

    @staticmethod
    def _envelope_dict(envelope: ApiEnvelope) -> dict:
        payload = {
            "success": envelope.success,
            "request_id": envelope.request_id,
            "data": envelope.data,
        }
        if envelope.metadata:
            payload["metadata"] = {
                "investigation_id": envelope.metadata.investigation_id,
                "duration_ms": envelope.metadata.duration_ms,
                "generated_at": envelope.metadata.generated_at.isoformat()
                if envelope.metadata.generated_at
                else None,
                "api_version": envelope.metadata.api_version,
                "investigation_level": envelope.metadata.investigation_level,
                "correlation_id": envelope.metadata.correlation_id,
                "partial": envelope.metadata.partial,
                "scope": envelope.metadata.scope,
            }
        if envelope.error:
            payload["error"] = {"code": envelope.error.code, "message": envelope.error.message}
        if envelope.pagination:
            payload["pagination"] = {
                "cursor": envelope.pagination.cursor,
                "limit": envelope.pagination.limit,
                "has_more": envelope.pagination.has_more,
            }
        return payload
