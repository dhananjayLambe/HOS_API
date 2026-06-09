"""Manual WhatsApp prescription resend API (after SKIPPED phone/PDF)."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.models.prescription import Prescription
from notifications.models.whatsapp_notifications import WhatsAppMessageStatus
from notifications.services.delivery.whatsapp_service import WhatsAppService
from notifications.services.presentation.whatsapp_status import serialize_whatsapp_message
from notifications.tasks import send_prescription_whatsapp


class WhatsAppResendAPIView(APIView):
    """POST /api/v1/notifications/whatsapp/resend/<uuid:prescription_id>/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request, prescription_id):
        prescription = (
            Prescription.objects.select_related(
                "consultation",
                "consultation__encounter",
                "consultation__encounter__doctor",
                "consultation__encounter__doctor__user",
            )
            .filter(pk=prescription_id)
            .first()
        )
        if prescription is None:
            return Response({"detail": "Prescription not found."}, status=status.HTTP_404_NOT_FOUND)

        doctor_user_id = prescription.consultation.encounter.doctor.user_id
        if doctor_user_id != request.user.id:
            return Response({"detail": "Not authorized to resend this delivery."}, status=status.HTTP_403_FORBIDDEN)

        try:
            message = WhatsAppService().resend_prescription_delivery(
                prescription_id=prescription_id,
                initiated_by=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if message.status == WhatsAppMessageStatus.QUEUED:
            send_prescription_whatsapp.delay(str(message.id))

        return Response(
            {
                "status": (message.status or "").lower(),
                "message": serialize_whatsapp_message(message),
            },
            status=status.HTTP_200_OK,
        )
