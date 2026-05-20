"""GET encounter-scoped operational report summaries (clinical timeline ASC)."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated

from diagnostics_engine.api.responses import success_response
from diagnostics_engine.api.serializers.reports.report_summary import ReportSummaryListSerializer
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.permissions.reports import CanViewReportDetail
from diagnostics_engine.services.reports.report_detail_presenter import build_report_summary_dto
from diagnostics_engine.services.reports.report_query_service import ReportQueryService


class EncounterReportsView(LabReportOperationalMixin):
    permission_classes = [IsAuthenticated, CanViewReportDetail]

    def get(self, request, encounter_id):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        from consultations_core.models.encounter import ClinicalEncounter

        encounter = get_object_or_404(ClinicalEncounter, pk=encounter_id)
        qs = ReportQueryService.get_encounter_reports_for_branch(
            encounter=encounter,
            branch_id=lab_user.branch_id,
        )
        reports = list(qs)
        summaries = [
            ReportSummaryListSerializer.from_dto(build_report_summary_dto(r)).data
            for r in reports
        ]
        return success_response(
            {"encounter_id": str(encounter.id), "reports": summaries},
            request=request,
        )
