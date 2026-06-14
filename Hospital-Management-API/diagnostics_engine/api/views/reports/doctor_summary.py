"""Doctor dashboard diagnostic report counts."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication

from diagnostics_engine.api.services.doctor_report_counts import count_pending_doctor_reports


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

        pending_review = count_pending_doctor_reports(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
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
