"""Workspace list / summary / detail / download API views."""

from __future__ import annotations

import mimetypes

from django.http import FileResponse, HttpResponseRedirect
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from diagnostics_engine.storage.report_storage import ReportStorageService
from shared.logging import LogModule, logger
from shared.logging.constants import CORRELATION_ID_HTTP_HEADER

from doctor_report_workspace.permissions.workspace import WorkspacePermission
from doctor_report_workspace.services.workspace.workspace_list_service import (
    WorkspaceListService,
    WorkspaceListValidationError,
)
from doctor_report_workspace.services.workspace.workspace_report_detail_service import (
    WorkspaceReportDetailService,
    WorkspaceReportDetailValidationError,
    WorkspaceReportNotFound,
)
from doctor_report_workspace.services.workspace.workspace_report_download_service import (
    WorkspaceReportDownloadService,
    WorkspaceReportDownloadValidationError,
)
from doctor_report_workspace.services.workspace.workspace_report_preview_service import (
    WorkspaceReportPreviewService,
    WorkspaceReportPreviewValidationError,
)
from doctor_report_workspace.services.workspace.workspace_summary_service import (
    WorkspaceSummaryService,
)


def _params(request) -> dict:
    return {k: request.query_params.get(k) for k in request.query_params.keys()}


def _correlation_headers(request) -> dict:
    corr = request.headers.get(CORRELATION_ID_HTTP_HEADER) or getattr(
        request, "correlation_id", None
    )
    if corr:
        return {CORRELATION_ID_HTTP_HEADER: corr}
    return {}


def _stream_artifact_response(artifact, *, as_attachment: bool) -> FileResponse:
    """Authenticated local/dev fallback when S3 presigned URLs are unavailable."""
    content = ReportStorageService.open_for_read(artifact)
    filename = ReportStorageService.download_filename(artifact)
    content_type = getattr(artifact, "content_type", None) or ""
    if not content_type:
        guessed, _ = mimetypes.guess_type(filename)
        content_type = guessed or "application/octet-stream"
    return FileResponse(
        content,
        as_attachment=as_attachment,
        filename=filename,
        content_type=content_type,
    )


class WorkspaceListAPIView(APIView):
    """GET /workspace/ — paginated report browser."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, WorkspacePermission]

    def get(self, request, *args, **kwargs):
        clinic_id = request.query_params.get("clinic_id")
        if not clinic_id:
            return Response(
                {"status": "error", "message": "clinic_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )

        doctor = getattr(request, "workspace_doctor", None)
        if doctor is None:
            return Response(
                {"status": "error", "message": "Doctor access required."},
                status=status.HTTP_403_FORBIDDEN,
                headers=_correlation_headers(request),
            )

        try:
            dto = WorkspaceListService().list_reports(
                doctor_id=doctor.id,
                clinic_id=clinic_id,
                params=_params(request),
            )
        except WorkspaceListValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )
        except Exception:
            logger.error(
                "Workspace list failed",
                module=LogModule.REPORTS,
                action="doctor_report_workspace.list",
                metadata={"clinic_id": str(clinic_id)},
            )
            raise

        return Response(
            {"status": "success", "data": dto.to_dict()},
            status=status.HTTP_200_OK,
            headers=_correlation_headers(request),
        )


class WorkspaceSummaryAPIView(APIView):
    """GET /workspace/summary/ — queue counts KPI strip."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, WorkspacePermission]

    def get(self, request, *args, **kwargs):
        clinic_id = request.query_params.get("clinic_id")
        if not clinic_id:
            return Response(
                {"status": "error", "message": "clinic_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )

        doctor = getattr(request, "workspace_doctor", None)
        if doctor is None:
            return Response(
                {"status": "error", "message": "Doctor access required."},
                status=status.HTTP_403_FORBIDDEN,
                headers=_correlation_headers(request),
            )

        try:
            dto = WorkspaceSummaryService().get_summary(
                doctor_id=doctor.id,
                clinic_id=clinic_id,
                params=_params(request),
            )
        except WorkspaceListValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )
        except Exception:
            logger.error(
                "Workspace summary failed",
                module=LogModule.REPORTS,
                action="doctor_report_workspace.summary",
                metadata={"clinic_id": str(clinic_id)},
            )
            raise

        return Response(
            {"status": "success", "data": dto.to_dict()},
            status=status.HTTP_200_OK,
            headers=_correlation_headers(request),
        )


class WorkspaceReportDetailAPIView(APIView):
    """GET /workspace/reports/{report_id}/ — clinical report detail aggregate."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, WorkspacePermission]

    def get(self, request, report_id, *args, **kwargs):
        clinic_id = request.query_params.get("clinic_id")
        if not clinic_id:
            return Response(
                {"status": "error", "message": "clinic_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )

        doctor = getattr(request, "workspace_doctor", None)
        if doctor is None:
            return Response(
                {"status": "error", "message": "Doctor access required."},
                status=status.HTTP_403_FORBIDDEN,
                headers=_correlation_headers(request),
            )

        try:
            dto = WorkspaceReportDetailService().get_detail(
                doctor_id=doctor.id,
                clinic_id=clinic_id,
                report_id=report_id,
            )
        except WorkspaceReportDetailValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )
        except WorkspaceReportNotFound:
            return Response(
                {"status": "error", "message": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
                headers=_correlation_headers(request),
            )
        except Exception:
            logger.error(
                "Workspace report detail failed",
                module=LogModule.REPORTS,
                action="doctor_report_workspace.detail",
                metadata={
                    "clinic_uuid": str(clinic_id),
                    "report_uuid": str(report_id),
                },
            )
            raise

        return Response(
            {"status": "success", "data": dto.to_dict()},
            status=status.HTTP_200_OK,
            headers=_correlation_headers(request),
        )


class WorkspaceReportDownloadAPIView(APIView):
    """GET /workspace/reports/{report_id}/download/ — audit then 302 (or local stream)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, WorkspacePermission]

    def get(self, request, report_id, *args, **kwargs):
        clinic_id = request.query_params.get("clinic_id")
        if not clinic_id:
            return Response(
                {"status": "error", "message": "clinic_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )

        doctor = getattr(request, "workspace_doctor", None)
        if doctor is None:
            return Response(
                {"status": "error", "message": "Doctor access required."},
                status=status.HTTP_403_FORBIDDEN,
                headers=_correlation_headers(request),
            )

        try:
            result = WorkspaceReportDownloadService().get_download(
                doctor_id=doctor.id,
                clinic_id=clinic_id,
                report_id=report_id,
                user=request.user,
                artifact_id=request.query_params.get("artifact_id"),
            )
        except WorkspaceReportDownloadValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )
        except WorkspaceReportNotFound:
            return Response(
                {"status": "error", "message": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
                headers=_correlation_headers(request),
            )
        except Exception:
            logger.error(
                "Workspace report download failed",
                module=LogModule.REPORTS,
                action="doctor_report_workspace.download",
                metadata={
                    "clinic_uuid": str(clinic_id),
                    "report_uuid": str(report_id),
                },
            )
            raise

        if result.stream_artifact is not None:
            response = _stream_artifact_response(
                result.stream_artifact, as_attachment=True
            )
        else:
            response = HttpResponseRedirect(result.url)
        for key, value in _correlation_headers(request).items():
            response[key] = value
        return response


class WorkspaceReportPreviewAPIView(APIView):
    """GET /workspace/reports/{report_id}/preview/ — audit then 302, stream, or unsupported JSON."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, WorkspacePermission]

    def get(self, request, report_id, *args, **kwargs):
        clinic_id = request.query_params.get("clinic_id")
        if not clinic_id:
            return Response(
                {"status": "error", "message": "clinic_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )

        doctor = getattr(request, "workspace_doctor", None)
        if doctor is None:
            return Response(
                {"status": "error", "message": "Doctor access required."},
                status=status.HTTP_403_FORBIDDEN,
                headers=_correlation_headers(request),
            )

        try:
            result = WorkspaceReportPreviewService().get_preview(
                doctor_id=doctor.id,
                clinic_id=clinic_id,
                report_id=report_id,
                user=request.user,
                artifact_id=request.query_params.get("artifact_id"),
            )
        except WorkspaceReportPreviewValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )
        except WorkspaceReportNotFound:
            return Response(
                {"status": "error", "message": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
                headers=_correlation_headers(request),
            )
        except Exception:
            logger.error(
                "Workspace report preview failed",
                module=LogModule.REPORTS,
                action="doctor_report_workspace.preview",
                metadata={
                    "clinic_uuid": str(clinic_id),
                    "report_uuid": str(report_id),
                },
            )
            raise

        if not result.supported:
            return Response(
                {"status": "success", "data": result.to_unsupported_dto().to_dict()},
                status=status.HTTP_200_OK,
                headers=_correlation_headers(request),
            )

        if result.stream_artifact is not None:
            response = _stream_artifact_response(
                result.stream_artifact, as_attachment=False
            )
        else:
            response = HttpResponseRedirect(result.url)
        for key, value in _correlation_headers(request).items():
            response[key] = value
        return response


# Backward-compatible aliases for Milestone 0 names
WorkspaceListView = WorkspaceListAPIView
WorkspaceSummaryView = WorkspaceSummaryAPIView


class WorkspacePatientSearchView(APIView):
    """GET patient search — deferred beyond Milestone 2."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, WorkspacePermission]

    def get(self, request, *args, **kwargs):
        return Response(
            {"status": "error", "message": "Patient search is not available yet."},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )
