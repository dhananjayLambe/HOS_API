"""DRF mixin for idempotent POST handlers."""

from __future__ import annotations

from rest_framework import status

from core.services.idempotency_service import (
    IdempotencyConflictError,
    IdempotencyReplay,
    begin_idempotent_request,
    get_idempotency_header,
    normalize_request_hash,
    store_idempotent_response,
)
from diagnostics_engine.api import error_codes
from diagnostics_engine.api.responses import error_response, success_response


class ReportIdempotencyMixin:
    """Optional Idempotency-Key header support for report mutating views."""

    idempotency_scope: str = ""

    def check_idempotency(self, request, *, body: dict | None = None):
        client_key = get_idempotency_header(request)
        if not client_key or not self.idempotency_scope:
            return None

        request_hash = normalize_request_hash(body=body, path=request.path)
        try:
            replay = begin_idempotent_request(
                scope=self.idempotency_scope,
                client_key=client_key,
                user=request.user,
                request_hash=request_hash,
            )
        except IdempotencyConflictError as exc:
            return error_response(
                str(exc),
                code=error_codes.IDEMPOTENCY_CONFLICT,
                status=status.HTTP_409_CONFLICT,
                request=request,
            )
        return replay

    def replay_idempotent_response(self, request, replay: IdempotencyReplay):
        return success_response(
            replay.response_snapshot,
            status=replay.response_status,
            request=request,
        )

    def persist_idempotent_response(
        self,
        request,
        *,
        body: dict | None,
        response_status: int,
        response_snapshot: dict,
    ) -> None:
        client_key = get_idempotency_header(request)
        if not client_key or not self.idempotency_scope:
            return
        request_hash = normalize_request_hash(body=body, path=request.path)
        store_idempotent_response(
            scope=self.idempotency_scope,
            client_key=client_key,
            user=request.user,
            request_hash=request_hash,
            response_status=response_status,
            response_snapshot=response_snapshot,
        )
