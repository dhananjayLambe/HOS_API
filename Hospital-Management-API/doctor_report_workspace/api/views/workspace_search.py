"""Workspace search API view."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from shared.logging import LogModule, logger
from shared.logging.constants import CORRELATION_ID_HTTP_HEADER

from doctor_report_workspace.permissions.workspace import WorkspacePermission
from doctor_report_workspace.services.workspace.workspace_search_service import (
    WorkspaceSearchService,
    WorkspaceSearchValidationError,
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


class WorkspaceSearchAPIView(APIView):
    """GET /workspace/search/ — server-side report search (list DTO contract)."""

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
            dto = WorkspaceSearchService().search(
                doctor_id=doctor.id,
                clinic_id=clinic_id,
                params=_params(request),
            )
        except WorkspaceSearchValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )
        except Exception:
            logger.error(
                "Workspace search failed",
                module=LogModule.REPORTS,
                action="doctor_report_workspace.search",
                metadata={"clinic_id": str(clinic_id)},
            )
            raise

        return Response(
            {"status": "success", "data": dto.to_dict()},
            status=status.HTTP_200_OK,
            headers=_correlation_headers(request),
        )
