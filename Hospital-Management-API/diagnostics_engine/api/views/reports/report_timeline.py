"""GET report lifecycle timeline (read-only operational audit)."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from diagnostics_engine.api import error_codes
from diagnostics_engine.api.responses import error_response, success_response, validation_error_response
from diagnostics_engine.api.serializers.reports.report_timeline import ReportTimelineSerializer
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.permissions.reports import CanViewReportDetail
from diagnostics_engine.services.reports.report_query_service import ReportQueryService
from diagnostics_engine.services.reports.report_timeline_presenter import build_report_timeline_dto


class ReportTimelineView(LabReportOperationalMixin):
    permission_classes = [IsAuthenticated, CanViewReportDetail]

    def get(self, request, report_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        report, err = self.get_report_for_branch(request, report_id, lab_user=lab_user)
        if err:
            return err

        try:
            report = ReportQueryService.get_operational_report_history(report_id=report.id)
        except DiagnosticTestReport.DoesNotExist:
            return error_response(
                "Report not found.",
                code=error_codes.REPORT_NOT_FOUND,
                status=status.HTTP_404_NOT_FOUND,
                request=request,
            )
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

        dto = build_report_timeline_dto(report)
        payload = ReportTimelineSerializer.from_dto(dto).data
        return success_response(payload, request=request)
