"""GET encounter-scoped operational report summaries (clinical timeline ASC)."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from diagnostics_engine.api import error_codes
from diagnostics_engine.api.responses import error_response, success_response
from diagnostics_engine.api.serializers.reports.report_summary import ReportSummaryListSerializer
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.services.reports.report_access_resolver import (
    ReportActorRole,
    resolve_encounter_access,
)
from diagnostics_engine.services.reports.report_detail_presenter import build_report_summary_dto
from diagnostics_engine.services.reports.report_query_service import ReportQueryService


class EncounterReportsView(LabReportOperationalMixin):
    permission_classes = [IsAuthenticated]

    def get(self, request, encounter_id):
        access = resolve_encounter_access(request, encounter_id)
        if access is None:
            return error_response(
                "You do not have permission to view these reports.",
                code=error_codes.PERMISSION_DENIED,
                status=status.HTTP_403_FORBIDDEN,
                request=request,
            )

        from consultations_core.models.encounter import ClinicalEncounter

        encounter = get_object_or_404(ClinicalEncounter, pk=encounter_id)

        if access.role == ReportActorRole.LAB:
            qs = ReportQueryService.get_encounter_reports_for_branch(
                encounter=encounter,
                branch_id=access.branch_id,
            )
        else:
            qs = ReportQueryService.get_reports_for_encounter(encounter=encounter)

        reports = list(qs)
        summaries = [
            ReportSummaryListSerializer.from_dto(build_report_summary_dto(r)).data
            for r in reports
        ]
        return success_response(
            {"encounter_id": str(encounter.id), "reports": summaries},
            request=request,
        )
