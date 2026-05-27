"""POST mark-ready — IN_PROGRESS → READY."""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.services.idempotency_service import IdempotencyReplay
from diagnostics_engine.api import error_codes
from diagnostics_engine.api.responses import error_response, success_response, validation_error_response
from diagnostics_engine.api.serializers.reports.delivery_actions import (
    MarkReadyRequestSerializer,
    MarkReadyResponseSerializer,
)
from diagnostics_engine.api.views.reports.idempotency_mixin import ReportIdempotencyMixin
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.domain.reports.report_actions import allowed_actions_for_report
from diagnostics_engine.permissions.reports import CanUploadReports
from diagnostics_engine.services.reports import ReportWorkflowService


class MarkReadyView(ReportIdempotencyMixin, LabReportOperationalMixin):
    permission_classes = [IsAuthenticated, CanUploadReports]
    idempotency_scope = "report.mark_ready"

    def post(self, request, report_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        report, err = self.get_report_for_branch(request, report_id, lab_user=lab_user)
        if err:
            return err

        ser = MarkReadyRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        notes = (ser.validated_data.get("notes") or "").strip() or None
        body = {"notes": notes or ""}

        idem = self.check_idempotency(request, body=body)
        if isinstance(idem, Response):
            return idem
        if isinstance(idem, IdempotencyReplay):
            return self.replay_idempotent_response(request, idem)

        try:
            ReportWorkflowService.mark_ready(report, user=request.user, notes=notes)
        except DjangoValidationError as exc:
            message = str(exc)
            if "superseded" in message.lower():
                return error_response(
                    message,
                    code=error_codes.REPORT_SUPERSEDED,
                    status=status.HTTP_404_NOT_FOUND,
                    request=request,
                )
            if "deleted" in message.lower():
                return error_response(
                    message,
                    code=error_codes.REPORT_NOT_FOUND,
                    status=status.HTTP_404_NOT_FOUND,
                    request=request,
                )
            return validation_error_response(exc, request=request)

        report.refresh_from_db()
        payload = MarkReadyResponseSerializer(
            {
                "report_id": report.id,
                "status": report.status,
                "available_actions": allowed_actions_for_report(report),
            }
        ).data
        self.persist_idempotent_response(
            request,
            body=body,
            response_status=status.HTTP_200_OK,
            response_snapshot=payload,
        )

        if getattr(settings, "REPORT_DELIVERY_ASYNC", True):
            from diagnostics_engine.tasks import on_report_finalized

            on_report_finalized.delay(str(report.id))

        return success_response(payload, request=request)
