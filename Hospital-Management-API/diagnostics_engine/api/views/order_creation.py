import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDiagnosticOrderOrchestrationActor
from consultations_core.models.consultation import Consultation
from diagnostics_engine.api.serializers.order_creation import (
    CreateDiagnosticOrderFromConsultationSerializer,
    DiagnosticOrderCreationResponseSerializer,
)
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationService

logger = logging.getLogger(__name__)


class CreateDiagnosticOrderFromConsultationView(APIView):
    """
    POST /api/diagnostics/orders/create-from-consultation/
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDiagnosticOrderOrchestrationActor]

    def post(self, request):
        ser = CreateDiagnosticOrderFromConsultationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        consultation = get_object_or_404(
            Consultation.objects.select_related("encounter", "encounter__patient_profile"),
            pk=ser.validated_data["consultation_id"],
        )
        branch_id = ser.validated_data.get("branch_id")

        try:
            result = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch_id=branch_id,
                source="emr",
                created_by=request.user,
            )
        except DjangoValidationError as e:
            msgs = list(getattr(e, "messages", []) or [])
            detail = "; ".join(str(m) for m in msgs if str(m).strip()) or str(e)
            logger.info("diagnostic order creation validation failed: %s", detail)
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        payload = DiagnosticOrderCreationResponseSerializer.from_result(result)
        return Response(payload, status=status.HTTP_201_CREATED if not result.idempotent else status.HTTP_200_OK)
