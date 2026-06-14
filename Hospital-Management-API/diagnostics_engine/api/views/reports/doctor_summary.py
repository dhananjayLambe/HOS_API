"""Doctor dashboard diagnostic report counts."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication

from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.reports import DiagnosticTestReport


class DoctorReportDashboardSummaryView(APIView):
    """GET pending diagnostic reports awaiting doctor review for a clinic."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic_id = request.query_params.get("clinic_id")
        doctor_id = request.query_params.get("doctor_id")

        if not clinic_id or not doctor_id:
            return Response(
                {"status": "error", "message": "doctor_id and clinic_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pending_review = (
            DiagnosticTestReport.objects.filter(
                status=ReportLifecycleStatus.READY,
                reviewed_at__isnull=True,
                deleted_at__isnull=True,
                order_test_line__order__encounter__doctor_id=doctor_id,
                order_test_line__order__encounter__clinic_id=clinic_id,
            )
            .distinct()
            .count()
        )

        return Response(
            {
                "status": "success",
                "data": {
                    "pending_review": pending_review,
                },
            },
            status=status.HTTP_200_OK,
        )
