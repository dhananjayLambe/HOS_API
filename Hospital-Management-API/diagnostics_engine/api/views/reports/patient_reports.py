"""GET patient-wide operational report summaries."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from diagnostics_engine.api import error_codes
from diagnostics_engine.api.pagination import ReportSummaryCursorPagination
from diagnostics_engine.api.responses import error_response, success_response
from diagnostics_engine.api.serializers.reports.report_summary import ReportSummaryListSerializer
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.permissions.reports import CanViewReportDetail
from diagnostics_engine.services.reports.report_access_resolver import (
    ReportActorRole,
    resolve_patient_profile_access,
)
from diagnostics_engine.services.reports.report_detail_presenter import build_report_summary_dto
from diagnostics_engine.services.reports.report_query_service import ReportQueryService
from patient_account.models import PatientProfile


class PatientReportsView(LabReportOperationalMixin):
    permission_classes = [IsAuthenticated]
    pagination_class = ReportSummaryCursorPagination

    def get(self, request, patient_id):
        access = resolve_patient_profile_access(request, patient_id)
        if access is None:
            return error_response(
                "You do not have permission to view these reports.",
                code=error_codes.PERMISSION_DENIED,
                status=status.HTTP_403_FORBIDDEN,
                request=request,
            )

        patient = get_object_or_404(PatientProfile, pk=patient_id)
        params = request.query_params

        if access.role == ReportActorRole.LAB:
            qs = ReportQueryService.get_patient_reports_for_branch(
                patient_profile=patient,
                branch_id=access.branch_id,
                status=params.get("status"),
                encounter_id=params.get("encounter_id"),
                date_from=params.get("date_from"),
                date_to=params.get("date_to"),
            )
        else:
            qs = ReportQueryService.get_reports_for_patient(patient_profile=patient)
            qs = ReportQueryService.apply_patient_report_filters(
                qs,
                status=params.get("status"),
                encounter_id=params.get("encounter_id"),
                date_from=params.get("date_from"),
                date_to=params.get("date_to"),
            )
            if access.role == ReportActorRole.DOCTOR:
                qs = qs.filter(
                    order_test_line__order__encounter__doctor__user_id=request.user.id,
                )

        paginator = ReportSummaryCursorPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        reports = list(page) if page is not None else []
        results = [
            ReportSummaryListSerializer.from_dto(build_report_summary_dto(r)).data
            for r in reports
        ]
        return success_response(
            {
                "results": results,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
            },
            request=request,
        )
