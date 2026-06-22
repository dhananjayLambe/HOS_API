"""Manual WhatsApp delivery retry API."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from notifications.models.whatsapp_notifications import WhatsAppMessage, WhatsAppMessageStatus
from notifications.services.delivery.whatsapp_service import WhatsAppService
from notifications.services.presentation.whatsapp_status import (
    can_retry_whatsapp_message,
    effective_whatsapp_status,
    serialize_whatsapp_message,
)
from notifications.tasks import send_prescription_whatsapp


class WhatsAppRetryAPIView(APIView):
    """POST /api/v1/notifications/whatsapp/retry/<uuid:message_id>/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request, message_id):
        message = (
            WhatsAppMessage.objects.select_related(
                "prescription",
                "prescription__consultation",
                "prescription__consultation__encounter",
                "prescription__consultation__encounter__doctor",
                "prescription__consultation__encounter__doctor__user",
                "encounter",
                "encounter__doctor",
                "encounter__doctor__user",
            )
            .filter(pk=message_id, is_deleted=False)
            .first()
        )
        if message is None:
            return Response({"detail": "WhatsApp message not found."}, status=status.HTTP_404_NOT_FOUND)

        if message.prescription is not None:
            doctor_user_id = message.prescription.consultation.encounter.doctor.user_id
        elif message.encounter is not None:
            doctor_user_id = message.encounter.doctor.user_id
        else:
            return Response({"detail": "Message is not linked to a consultation."}, status=status.HTTP_400_BAD_REQUEST)

        if doctor_user_id != request.user.id:
            return Response({"detail": "Not authorized to retry this delivery."}, status=status.HTTP_403_FORBIDDEN)

        if not can_retry_whatsapp_message(message):
            if effective_whatsapp_status(message) in {
                WhatsAppMessageStatus.SENT,
                WhatsAppMessageStatus.DELIVERED,
                WhatsAppMessageStatus.READ,
            }:
                return Response(
                    {"detail": "WhatsApp was already sent. Refresh the page to see the latest status."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"detail": "Only failed deliveries can be retried."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if message.status != WhatsAppMessageStatus.FAILED:
            message.status = WhatsAppMessageStatus.FAILED
            message.save(update_fields=["status", "updated_at"])

        try:
            retry_message = WhatsAppService().retry_delivery(
                message_id=message_id,
                initiated_by=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        send_prescription_whatsapp.delay(str(retry_message.id))
        return Response(
            {
                "status": "queued",
                "message": serialize_whatsapp_message(retry_message),
            },
            status=status.HTTP_200_OK,
        )
