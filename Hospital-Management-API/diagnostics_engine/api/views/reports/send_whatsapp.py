"""POST send-whatsapp — prepare delivery + mark sent (Phase 1 simulate)."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.permissions import IsAuthenticated

from diagnostics_engine.api.responses import success_response, validation_error_response
from diagnostics_engine.api.serializers.reports.delivery_actions import (
    SendWhatsAppRequestSerializer,
    SendWhatsAppResponseSerializer,
)
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.domain.reports.report_actions import allowed_actions_for_report
from diagnostics_engine.permissions.reports import CanDeliverReports
from diagnostics_engine.services.reports.report_delivery_service import ReportDeliveryService


class SendWhatsAppView(LabReportOperationalMixin):
    permission_classes = [IsAuthenticated, CanDeliverReports]

    def post(self, request, report_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        report, err = self.get_report_for_branch(request, report_id, lab_user=lab_user)
        if err:
            return err

        ser = SendWhatsAppRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            log = ReportDeliveryService.prepare_report_delivery(
                report=report,
                recipient_phone=ser.validated_data["recipient_phone"],
                initiated_by=request.user,
                channel=ser.validated_data.get("channel", "WHATSAPP"),
            )
            ReportDeliveryService.mark_delivery_sent(delivery_log=log)
        except DjangoValidationError as exc:
            return validation_error_response(exc, request=request)

        log.refresh_from_db()
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
        return success_response(payload, request=request)
