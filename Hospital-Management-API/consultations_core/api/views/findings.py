# consultations_core/api/views/findings.py
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.api.serializers.findings import (
    ConsultationFindingSerializer,
    CreateConsultationFindingSerializer,
    PatchConsultationFindingSerializer,
    apply_patch_to_instance,
)
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.findings import ConsultationFinding, CustomFinding, FindingMaster
from consultations_core.services.finding_master_service import get_or_create_finding_master_for_code

logger = logging.getLogger(__name__)

MSG_VISIT_CANCELLED = "This visit has been cancelled. Please start a new one."


def _get_consultation_or_404(encounter: ClinicalEncounter) -> Consultation:
    try:
        return encounter.consultation
    except Consultation.DoesNotExist:
        return get_object_or_404(Consultation, encounter=encounter)


def _consultation_finalized(encounter: ClinicalEncounter) -> bool:
    try:
        c = encounter.consultation
        return c.is_finalized
    except Consultation.DoesNotExist:
        return False


class EncounterFindingsListCreateAPIView(APIView):
    """
    GET  /consultations/encounter/{id}/findings/  — active findings for consultation
    POST — add master (finding_code | finding_id) or custom (custom_name)
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_encounter(self, encounter_id):
        return get_object_or_404(ClinicalEncounter, id=encounter_id)

    def get(self, request, encounter_id):
        encounter = self.get_encounter(encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return Response({"detail": MSG_VISIT_CANCELLED}, status=status.HTTP_400_BAD_REQUEST)
        consultation = _get_consultation_or_404(encounter)
        qs = (
            ConsultationFinding.objects.filter(consultation=consultation, is_active=True)
            .select_related("finding", "custom_finding", "consultation")
            .order_by("-created_at")
        )
        return Response(ConsultationFindingSerializer(qs, many=True).data)

    @transaction.atomic
    def post(self, request, encounter_id):
        encounter = self.get_encounter(encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return Response({"detail": MSG_VISIT_CANCELLED}, status=status.HTTP_400_BAD_REQUEST)
        if encounter.status != "consultation_in_progress":
            return Response(
                {"detail": "Findings can only be edited while consultation is in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if _consultation_finalized(encounter):
            return Response(
                {"detail": "Consultation is finalized; cannot add findings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        consultation = _get_consultation_or_404(encounter)
        ser = CreateConsultationFindingSerializer(data=request.data)
        if not ser.is_valid():
            logger.warning(
                "EncounterFindingsListCreateAPIView validation failed encounter=%s errors=%s body=%s",
                encounter_id,
                ser.errors,
                request.data,
            )
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data
        user = request.user

        try:
            if (data.get("custom_name") or "").strip():
                name = data["custom_name"].strip()
                cf = CustomFinding.objects.create(
                    consultation=consultation,
                    name=name,
                    created_by=user,
                )
                row = ConsultationFinding(
                    consultation=consultation,
                    finding=None,
                    custom_finding=cf,
                    created_by=user,
                )
                row.save()
            else:
                master = None
                if data.get("finding_id"):
                    master = FindingMaster.objects.filter(
                        id=data["finding_id"], is_active=True
                    ).first()
                    if master is None:
                        return Response(
                            {"detail": "Finding master not found or inactive."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    code = (data.get("finding_code") or "").strip()
                    try:
                        master = get_or_create_finding_master_for_code(code, user=user)
                    except DjangoValidationError as e:
                        msgs = getattr(e, "messages", None)
                        msg = "; ".join(str(m) for m in msgs) if msgs else str(e)
                        logger.warning(
                            "Finding master resolve failed encounter=%s code=%s: %s",
                            encounter_id,
                            code,
                            msg,
                        )
                        return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

                row = ConsultationFinding(
                    consultation=consultation,
                    finding=master,
                    custom_finding=None,
                    created_by=user,
                )
                row.save()
        except DjangoValidationError as e:
            msgs = getattr(e, "messages", None)
            msg = "; ".join(str(m) for m in msgs) if msgs else str(e)
            logger.warning(
                "ConsultationFinding create validation encounter=%s: %s",
                encounter_id,
                msg,
            )
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError as e:
            logger.warning(
                "ConsultationFinding create integrity encounter=%s: %s",
                encounter_id,
                e,
            )
            return Response(
                {"detail": "This finding is already added for this consultation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        row.refresh_from_db()
        return Response(
            ConsultationFindingSerializer(row).data,
            status=status.HTTP_201_CREATED,
        )


class ConsultationFindingUpdateDeleteAPIView(APIView):
    """
    PATCH /consultations/findings/{id}/  — severity, note, extension_data
    DELETE — soft delete (deactivate)
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_row(self, pk):
        return get_object_or_404(
            ConsultationFinding.objects.select_related(
                "consultation", "consultation__encounter", "finding", "custom_finding"
            ),
            id=pk,
        )

    def patch(self, request, pk):
        row = self.get_row(pk)
        encounter = row.consultation.encounter
        if encounter.status in ("cancelled", "no_show"):
            return Response({"detail": MSG_VISIT_CANCELLED}, status=status.HTTP_400_BAD_REQUEST)
        if _consultation_finalized(encounter):
            return Response(
                {"detail": "Consultation is finalized; cannot update findings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = PatchConsultationFindingSerializer(data=request.data, partial=True)
        if not ser.is_valid():
            logger.warning(
                "PatchConsultationFindingSerializer failed id=%s errors=%s body=%s",
                pk,
                ser.errors,
                request.data,
            )
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            apply_patch_to_instance(row, ser.validated_data, user=request.user)
        except serializers.ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        row.refresh_from_db()
        return Response(ConsultationFindingSerializer(row).data)

    def delete(self, request, pk):
        row = self.get_row(pk)
        encounter = row.consultation.encounter
        if encounter.status in ("cancelled", "no_show"):
            return Response({"detail": MSG_VISIT_CANCELLED}, status=status.HTTP_400_BAD_REQUEST)
        if _consultation_finalized(encounter):
            return Response(
                {"detail": "Consultation is finalized; cannot remove findings."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            row.deactivate()
        except DjangoValidationError as e:
            msgs = getattr(e, "messages", None)
            msg = "; ".join(str(m) for m in msgs) if msgs else str(e)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
