from __future__ import annotations

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.permissions import IsDoctorOrHelpdeskOrClinicAdminOrSuperuser
from reports.selectors import build_filtered_queryset, build_scoped_queryset
from reports.serializers import (
    AppointmentSummaryFilterSerializer,
    AppointmentSummaryReportResponseSerializer,
)
from reports.services import (
    build_appointment_type_distribution,
    build_daily_trends,
    build_doctor_load,
    build_monthly_trends,
    build_operational_summary,
    build_patient_split,
    build_peak_hours,
    build_performance_insights,
    build_recent_appointments,
    build_status_distribution,
    build_summary,
)


class AppointmentSummaryReportView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdeskOrClinicAdminOrSuperuser]

    def get(self, request):
        filters = AppointmentSummaryFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        validated = filters.validated_data

        clinic_id = self._resolve_clinic_id(request)
        base_queryset = build_scoped_queryset(clinic_id=clinic_id)

        if validated.get("doctor_id") and not base_queryset.filter(doctor_id=validated["doctor_id"]).exists():
            return Response({"detail": "doctor_id not found in allowed scope."}, status=status.HTTP_400_BAD_REQUEST)

        current_queryset = build_filtered_queryset(
            queryset=base_queryset,
            start_date=validated["start_date"],
            end_date=validated["end_date"],
            doctor_id=validated.get("doctor_id"),
            appointment_type=validated.get("appointment_type"),
            status=validated.get("status"),
        )

        doctor_load_queryset = build_filtered_queryset(
            queryset=base_queryset,
            start_date=validated["start_date"],
            end_date=validated["end_date"],
            doctor_id=validated.get("doctor_id"),
            appointment_type=validated.get("appointment_type"),
            status=None,
        )

        summary = build_summary(
            current_queryset,
            base_queryset,
            validated["start_date"],
            validated["end_date"],
            clinic_id=clinic_id,
            doctor_id=validated.get("doctor_id"),
            appointment_type=validated.get("appointment_type"),
            status=validated.get("status"),
        )
        status_distribution = build_status_distribution(current_queryset)
        appointment_type_distribution = build_appointment_type_distribution(current_queryset)
        daily_trends = build_daily_trends(base_queryset, validated["end_date"])
        monthly_trends = build_monthly_trends(base_queryset, validated["end_date"])
        peak_hours = build_peak_hours(current_queryset)
        patient_split = build_patient_split(current_queryset)
        doctor_load = build_doctor_load(
            doctor_load_queryset,
            validated["start_date"],
            validated["end_date"],
            clinic_id=clinic_id,
            doctor_id=validated.get("doctor_id"),
            appointment_type=validated.get("appointment_type"),
        )
        recent_appointments = build_recent_appointments(current_queryset)
        operational_summary = build_operational_summary(current_queryset, daily_trends, peak_hours, patient_split)
        performance_insights = build_performance_insights(
            patient_split=patient_split,
            summary=summary,
            peak_hours=peak_hours,
        )

        payload = {
            "summary": summary,
            "operational_summary": operational_summary,
            "performance_insights": performance_insights,
            "status_distribution": status_distribution,
            "appointment_type_distribution": appointment_type_distribution,
            "daily_trends": daily_trends,
            "monthly_trends": monthly_trends,
            "peak_hours": peak_hours,
            "patient_split": patient_split,
            "doctor_load": doctor_load,
            "recent_appointments": recent_appointments,
        }
        response_serializer = AppointmentSummaryReportResponseSerializer(payload)
        return Response(response_serializer.data)

    def _resolve_clinic_id(self, request):
        user = request.user
        if user.is_superuser:
            return None
        if hasattr(user, "doctor") and user.doctor:
            # doctors can have many clinics; appointments always store clinic FK.
            # use no forced clinic for now to support cross-clinic doctors.
            return None
        if hasattr(user, "helpdesk_profile") and user.helpdesk_profile:
            return user.helpdesk_profile.clinic_id
        if hasattr(user, "clinic_admin_profile") and user.clinic_admin_profile:
            return user.clinic_admin_profile.clinic_id
        return None
