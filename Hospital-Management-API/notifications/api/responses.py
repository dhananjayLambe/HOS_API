"""Standard success/error envelopes for notification operational APIs."""

from __future__ import annotations

import uuid

from django.core.exceptions import ValidationError
from rest_framework.response import Response


def get_request_id(request) -> str:
    if request is None:
        return str(uuid.uuid4())
    header = (request.META.get("HTTP_X_REQUEST_ID") or "").strip()
    if header:
        return header[:128]
    if not hasattr(request, "_notifications_request_id"):
        request._notifications_request_id = str(uuid.uuid4())
    return request._notifications_request_id


def success_response(data, *, status: int = 200, request=None) -> Response:
    return Response(
        {
            "success": True,
            "request_id": get_request_id(request),
            "data": data,
        },
        status=status,
    )


def error_response(
    message: str,
    *,
    code: str,
    status: int = 400,
    request=None,
) -> Response:
    return Response(
        {
            "success": False,
            "request_id": get_request_id(request),
            "error": {
                "code": code,
                "message": message,
            },
        },
        status=status,
    )


def validation_error_response(exc: ValidationError, *, request=None) -> Response:
    if hasattr(exc, "message_dict"):
        parts = []
        for key, msgs in exc.message_dict.items():
            for msg in msgs:
                parts.append(f"{key}: {msg}")
        message = " ".join(parts) if parts else str(exc)
    elif hasattr(exc, "messages"):
        message = " ".join(str(m) for m in exc.messages)
    else:
        message = str(exc)
    from notifications.api import error_codes

    return error_response(message, code=error_codes.VALIDATION_FAILED, status=400, request=request)
