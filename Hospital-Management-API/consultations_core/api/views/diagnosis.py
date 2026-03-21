from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.models.consultation import Consultation
from consultations_core.models.diagnosis import CustomDiagnosis
from consultations_core.models.encounter import ClinicalEncounter


class EncounterCustomDiagnosisCreateAPIView(APIView):
    """
    POST /consultations/encounter/{id}/diagnoses/custom/
    Creates (or reuses) a CustomDiagnosis row during draft mode.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request, encounter_id):
        encounter = get_object_or_404(ClinicalEncounter, id=encounter_id)
        if encounter.status in ("cancelled", "no_show"):
            return Response(
                {"detail": "This visit has been cancelled. Please start a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if encounter.status != "consultation_in_progress":
            return Response(
                {"detail": "Custom diagnoses can be added only while consultation is in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            consultation = encounter.consultation
        except Consultation.DoesNotExist:
            return Response(
                {"detail": "Consultation record not found for this encounter."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if consultation.is_finalized:
            return Response(
                {"detail": "Consultation is finalized; cannot add diagnosis."},
                status=status.HTTP_403_FORBIDDEN,
            )

        name = str(request.data.get("name") or "").strip()
        if not name:
            return Response(
                {"detail": "name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        row = CustomDiagnosis.objects.filter(
            consultation=consultation,
            name__iexact=name,
        ).first()
        if row is None:
            try:
                row = CustomDiagnosis.objects.create(
                    consultation=consultation,
                    name=name,
                    created_by=request.user,
                )
            except DjangoValidationError as e:
                msg = "; ".join(getattr(e, "messages", [str(e)]))
                return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"id": str(row.id), "name": row.name},
            status=status.HTTP_201_CREATED,
        )
