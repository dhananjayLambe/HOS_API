"""Doctor Diagnostic Workspace API views."""

from __future__ import annotations

from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from diagnostics_engine.domain.reports.active_report import active_reports_queryset
from doctor.api.services.doctor_diagnostic_workspace_service import DoctorDiagnosticWorkspaceService
from doctor.models import doctor as Doctor


def _doctor_context(request):
    if not request.user.groups.filter(name="doctor").exists():
        return None, Response(
            {"status": "error", "message": "Doctor access required."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        doctor = Doctor.objects.get(user=request.user)
    except Doctor.DoesNotExist:
        return None, Response(
            {"status": "error", "message": "Doctor profile not found."},
            status=status.HTTP_403_FORBIDDEN,
        )
    clinic_id = request.query_params.get("clinic_id")
    if not clinic_id:
        return None, Response(
            {"status": "error", "message": "clinic_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return {"doctor_id": doctor.id, "clinic_id": clinic_id}, None


class DoctorWorkspacePatientsSearchView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        context, error = _doctor_context(request)
        if error:
            return error
        service = DoctorDiagnosticWorkspaceService(**context)
        data = service.search_patients(q=request.query_params.get("q", ""))
        return Response({"status": "success", "data": data}, status=status.HTTP_200_OK)


class DoctorWorkspaceCountsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        context, error = _doctor_context(request)
        if error:
            return error
        service = DoctorDiagnosticWorkspaceService(**context)
        data = service.get_queue_counts(q=request.query_params.get("q"))
        return Response({"status": "success", "data": data}, status=status.HTTP_200_OK)


class DoctorWorkspaceReportsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        context, error = _doctor_context(request)
        if error:
            return error
        service = DoctorDiagnosticWorkspaceService(**context)
        filters = {
            "lab": request.query_params.get("lab") or "",
            "category": request.query_params.get("category") or "",
            "doctor": request.query_params.get("doctor") or "",
            "branch": request.query_params.get("branch") or "",
            "status": request.query_params.get("status") or "",
        }
        data = service.list_reports(
            q=request.query_params.get("q"),
            queue=request.query_params.get("queue"),
            quick_filter=request.query_params.get("quick_filter"),
            filters=filters,
            page=int(request.query_params.get("page", 1)),
            page_size=int(request.query_params.get("page_size", 25)),
        )
        return Response({"status": "success", "data": data}, status=status.HTTP_200_OK)


class DoctorWorkspaceReportDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id):
        context, error = _doctor_context(request)
        if error:
            return error
        service = DoctorDiagnosticWorkspaceService(**context)
        data = service.get_report_detail(report_id=report_id)
        if not data:
            return Response(
                {"status": "error", "message": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"status": "success", "data": data}, status=status.HTTP_200_OK)


class DoctorWorkspaceArtifactDownloadView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id, artifact_id):
        context, error = _doctor_context(request)
        if error:
            return error
        report = (
            active_reports_queryset()
            .filter(id=report_id, artifacts__id=artifact_id, artifacts__is_active=True)
            .first()
        )
        if not report:
            return Response(
                {"status": "error", "message": "Artifact not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Verify doctor can access report using detail service.
        service = DoctorDiagnosticWorkspaceService(**context)
        if not service.get_report_detail(report_id=report_id):
            return Response(
                {"status": "error", "message": "Forbidden."},
                status=status.HTTP_403_FORBIDDEN,
            )
        artifact = report.artifacts.filter(id=artifact_id, is_active=True).first()
        if not artifact or not artifact.file:
            return Response(
                {"status": "error", "message": "Artifact file missing."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return HttpResponseRedirect(artifact.file.url)
