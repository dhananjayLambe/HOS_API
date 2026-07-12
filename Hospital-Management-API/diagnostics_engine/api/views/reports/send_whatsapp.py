"""POST send-whatsapp — prepare delivery + async send."""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.services.idempotency_service import IdempotencyReplay
from diagnostics_engine.api.responses import success_response, validation_error_response
from diagnostics_engine.api.serializers.reports.delivery_actions import (
    SendWhatsAppRequestSerializer,
    SendWhatsAppResponseSerializer,
)
from diagnostics_engine.api.views.reports.idempotency_mixin import ReportIdempotencyMixin
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.domain.reports.report_actions import allowed_actions_for_report
from diagnostics_engine.permissions.reports import CanDeliverReports
from diagnostics_engine.services.reports.report_audit import emit_report_audit_event
from diagnostics_engine.services.reports.report_delivery_service import ReportDeliveryService
from diagnostics_engine.monitoring.report_events import safe_emit


class SendWhatsAppView(ReportIdempotencyMixin, LabReportOperationalMixin):
    permission_classes = [IsAuthenticated, CanDeliverReports]
    idempotency_scope = "report.send_whatsapp"

    def post(self, request, report_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        report, err = self.get_report_for_branch(request, report_id, lab_user=lab_user)
        if err:
            return err

        ser = SendWhatsAppRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        channel = ser.validated_data.get("channel", "WHATSAPP")
        body = {
            "recipient_phone": ser.validated_data.get("recipient_phone", ""),
            "recipient_email": ser.validated_data.get("recipient_email", ""),
            "channel": channel,
        }

        idem = self.check_idempotency(request, body=body)
        if isinstance(idem, Response):
            return idem
        if isinstance(idem, IdempotencyReplay):
            return self.replay_idempotent_response(request, idem)

        recipient = ser.validated_data["recipient"]
        try:
            log = ReportDeliveryService.prepare_report_delivery(
                report=report,
                recipient=recipient,
                initiated_by=request.user,
                channel=channel,
            )
            safe_emit(
                emit_report_audit_event,
                action="report_shared",
                report=report,
                user=request.user,
                metadata={"log_id": str(log.id), "channel": channel},
            )
            from diagnostics_engine.audit import schedule_report_shared

            schedule_report_shared(
                report=report,
                user=request.user,
                channel=channel,
            )
            if getattr(settings, "REPORT_DELIVERY_ASYNC", True):
                from diagnostics_engine.tasks import deliver_report_whatsapp

                deliver_report_whatsapp.delay(str(log.id))
                log.refresh_from_db()
            else:
                ReportDeliveryService.execute_delivery_send(delivery_log=log)
                log.refresh_from_db()
        except DjangoValidationError as exc:
            return validation_error_response(exc, request=request)

        report.refresh_from_db()
        payload = SendWhatsAppResponseSerializer(
            {
                "report_id": report.id,
                "delivery_status": log.delivery_status,
                "delivery_log_id": log.id,
                "channel": log.delivery_channel,
                "available_actions": allowed_actions_for_report(report),
            }
        ).data
        self.persist_idempotent_response(
            request,
            body=body,
            response_status=status.HTTP_200_OK,
            response_snapshot=payload,
        )
        return success_response(payload, request=request)
