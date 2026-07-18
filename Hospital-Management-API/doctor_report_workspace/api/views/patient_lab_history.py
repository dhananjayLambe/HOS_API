"""Patient Lab History API views.

Access rule (permanent product rule):
  Doctor → Clinic → Reports
Never return cross-clinic reports for a patient unless the patient explicitly shares later.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from shared.logging import LogModule, logger
from shared.logging.constants import CORRELATION_ID_HTTP_HEADER

from doctor_report_workspace.permissions.workspace import WorkspacePermission
from doctor_report_workspace.services.patient_lab_history import (
    PatientLabHistoryNotFound,
    PatientLabHistoryService,
    PatientLabHistoryValidationError,
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


def _require_clinic_and_doctor(request):
    clinic_id = request.query_params.get("clinic_id")
    if not clinic_id:
        return None, Response(
            {"status": "error", "message": "clinic_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
            headers=_correlation_headers(request),
        )
    doctor = getattr(request, "workspace_doctor", None)
    if doctor is None:
        return None, Response(
            {"status": "error", "message": "Doctor access required."},
            status=status.HTTP_403_FORBIDDEN,
            headers=_correlation_headers(request),
        )
    return (clinic_id, doctor), None


class PatientLabHistorySummaryAPIView(APIView):
    """GET /patients/{patient_id}/lab-history/summary/?clinic_id="""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, WorkspacePermission]

    def get(self, request, patient_id, *args, **kwargs):
        ctx, err = _require_clinic_and_doctor(request)
        if err:
            return err
        clinic_id, doctor = ctx
        try:
            dto = PatientLabHistoryService().get_summary(
                doctor_id=doctor.id,
                clinic_id=clinic_id,
                patient_id=patient_id,
            )
        except PatientLabHistoryValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )
        except Exception:
            logger.error(
                "Patient lab history summary failed",
                module=LogModule.REPORTS,
                action="doctor_report_workspace.patient_lab_history.summary",
                metadata={"patient_id": str(patient_id), "clinic_id": str(clinic_id)},
            )
            raise
        return Response(
            {"status": "success", "data": dto.to_dict()},
            status=status.HTTP_200_OK,
            headers=_correlation_headers(request),
        )


class PatientLabHistoryListAPIView(APIView):
    """GET /patients/{patient_id}/lab-history/?clinic_id=&q=&date_from=&date_to=&status=&cursor="""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, WorkspacePermission]

    def get(self, request, patient_id, *args, **kwargs):
        ctx, err = _require_clinic_and_doctor(request)
        if err:
            return err
        clinic_id, doctor = ctx
        try:
            dto = PatientLabHistoryService().list_history(
                doctor_id=doctor.id,
                clinic_id=clinic_id,
                patient_id=patient_id,
                params=_params(request),
            )
        except PatientLabHistoryValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )
        except Exception:
            logger.error(
                "Patient lab history list failed",
                module=LogModule.REPORTS,
                action="doctor_report_workspace.patient_lab_history.list",
                metadata={"patient_id": str(patient_id), "clinic_id": str(clinic_id)},
            )
            raise
        return Response(
            {"status": "success", "data": dto.to_dict()},
            status=status.HTTP_200_OK,
            headers=_correlation_headers(request),
        )


class PatientLabHistoryDetailAPIView(APIView):
    """GET /patients/{patient_id}/lab-history/{report_id}/?clinic_id="""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, WorkspacePermission]

    def get(self, request, patient_id, report_id, *args, **kwargs):
        ctx, err = _require_clinic_and_doctor(request)
        if err:
            return err
        clinic_id, doctor = ctx
        try:
            dto = PatientLabHistoryService().get_detail(
                doctor_id=doctor.id,
                clinic_id=clinic_id,
                patient_id=patient_id,
                report_id=report_id,
            )
        except PatientLabHistoryValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
                headers=_correlation_headers(request),
            )
        except PatientLabHistoryNotFound:
            return Response(
                {"status": "error", "message": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
                headers=_correlation_headers(request),
            )
        except Exception:
            logger.error(
                "Patient lab history detail failed",
                module=LogModule.REPORTS,
                action="doctor_report_workspace.patient_lab_history.detail",
                metadata={
                    "patient_id": str(patient_id),
                    "report_id": str(report_id),
                    "clinic_id": str(clinic_id),
                },
            )
            raise
        return Response(
            {"status": "success", "data": dto.to_dict()},
            status=status.HTTP_200_OK,
            headers=_correlation_headers(request),
        )
