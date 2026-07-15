"""Legacy report views (api/diagnostics/ — deprecated, use v1 operational routes)."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from diagnostics_engine.api.serializers.reports import (
    DeliverReportSerializer,
    DiagnosticTestReportSerializer,
    UploadReportArtifactSerializer,
)
from diagnostics_engine.models.orders import DiagnosticOrderTestLine
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.services.reports import (
    ArtifactUploadService,
    ReportDeliveryService,
    ReportQueryService,
    ReportWorkflowService,
)
from diagnostics_engine.storage.report_storage import ReportStorageService
from diagnostics_engine.permissions.reports import CanUploadReports
from diagnostics_engine.services.reports.access_control import report_belongs_to_branch
from labs.api.permissions import IsLabAdminUser
from labs.api.services.lab_session_resolver import LabSessionDenied, require_lab_operational_access


class TestLineReportView(APIView):
    """GET/POST report task for an execution test line."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, CanUploadReports]

    def get(self, request, line_id):
        report = ReportQueryService.active_report_for_line(line_id)
        if report is None:
            return Response({"detail": "No active report for this test line."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            DiagnosticTestReportSerializer(report, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, line_id):
        line = get_object_or_404(DiagnosticOrderTestLine, pk=line_id)
        try:
            report = ArtifactUploadService.create_or_get_report_for_line(
                order_test_line=line,
                uploaded_by=request.user,
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            DiagnosticTestReportSerializer(report, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ReportArtifactUploadView(APIView):
    """POST multipart artifact upload for a test report (legacy single-file)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, CanUploadReports]

    def post(self, request, report_id):
        report = get_object_or_404(DiagnosticTestReport, pk=report_id)
        ser = UploadReportArtifactSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            artifact = ArtifactUploadService.upload_artifact(
                report=report,
                file=ser.validated_data["file"],
                uploaded_by=request.user,
                artifact_type=ser.validated_data.get("artifact_type", "PDF"),
                is_primary=ser.validated_data.get("is_primary", False),
                version=ser.validated_data.get("version", 1),
                replace_primary=ser.validated_data.get("is_primary", False),
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        report.refresh_from_db()
        payload = DiagnosticTestReportSerializer(report, context={"request": request}).data
        payload["uploaded_artifact_id"] = str(artifact.id)
        return Response(payload, status=status.HTTP_201_CREATED)


class ReportReadyView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, CanUploadReports]

    def post(self, request, report_id):
        report = get_object_or_404(DiagnosticTestReport, pk=report_id)
        try:
            ReportWorkflowService.mark_ready(report, user=request.user)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        report.refresh_from_db()
        return Response(
            DiagnosticTestReportSerializer(report, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class ReportDeliverView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def post(self, request, report_id):
        report = get_object_or_404(DiagnosticTestReport, pk=report_id)
        ser = DeliverReportSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            log = ReportDeliveryService.deliver_via_channel(
                report=report,
                channel=ser.validated_data["channel"],
                recipient=ser.validated_data["recipient"],
                user=request.user,
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        report.refresh_from_db()
        payload = DiagnosticTestReportSerializer(report, context={"request": request}).data
        payload["delivery_log_id"] = str(log.id)
        return Response(payload, status=status.HTTP_200_OK)


class ReportArtifactDownloadView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def get(self, request, report_id, artifact_id):
        report = get_object_or_404(DiagnosticTestReport, pk=report_id)
        resolved = require_lab_operational_access(request)
        if isinstance(resolved, LabSessionDenied):
            return resolved.response
        if not report_belongs_to_branch(
            report=report,
            branch_id=resolved.lab_user.branch_id,
        ):
            return Response({"detail": "Branch access denied."}, status=status.HTTP_403_FORBIDDEN)
        artifact = get_object_or_404(report.artifacts, pk=artifact_id, is_active=True)
        filename = ReportStorageService.download_filename(artifact)
        inline = request.query_params.get("inline") == "1"
        return FileResponse(
            ReportStorageService.open_for_read(artifact),
            as_attachment=not inline,
            filename=filename,
        )


class OrderReportsListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsLabAdminUser]

    def get(self, request, order_id):
        from diagnostics_engine.models.orders import DiagnosticOrder

        order = get_object_or_404(DiagnosticOrder, pk=order_id)
        reports = ReportQueryService.reports_for_order(order)
        return Response(
            DiagnosticTestReportSerializer(reports, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
