"""Doctor dashboard API views."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from doctor.api.services.patients_dashboard_service import build_doctor_patients_dashboard
from doctor.api.services.reports_dashboard_service import build_doctor_reports_dashboard
from doctor.models import doctor as Doctor


class DoctorPatientsDashboardView(APIView):
    """GET aggregated patients tab data for doctor dashboard."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.groups.filter(name="doctor").exists():
            return Response(
                {"status": "error", "message": "Doctor access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            doctor = Doctor.objects.get(user=request.user)
        except Doctor.DoesNotExist:
            return Response(
                {"status": "error", "message": "Doctor profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        clinic_id = request.query_params.get("clinic_id")
        if not clinic_id:
            return Response(
                {"status": "error", "message": "clinic_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)

        data = build_doctor_patients_dashboard(
            doctor_id=doctor.id,
            clinic_id=clinic_id,
            page=page,
            page_size=page_size,
        )

        return Response(
            {
                "status": "success",
                "data": data,
            },
            status=status.HTTP_200_OK,
        )


class DoctorReportsDashboardView(APIView):
    """GET aggregated reports tab data for doctor dashboard."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.groups.filter(name="doctor").exists():
            return Response(
                {"status": "error", "message": "Doctor access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            doctor = Doctor.objects.get(user=request.user)
        except Doctor.DoesNotExist:
            return Response(
                {"status": "error", "message": "Doctor profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        clinic_id = request.query_params.get("clinic_id")
        if not clinic_id:
            return Response(
                {"status": "error", "message": "clinic_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)

        data = build_doctor_reports_dashboard(
            doctor_id=doctor.id,
            clinic_id=clinic_id,
            page=page,
            page_size=page_size,
        )

        return Response(
            {
                "status": "success",
                "data": data,
            },
            status=status.HTTP_200_OK,
        )
