"""Read-only WhatsApp delivery status for consultations."""

from __future__ import annotations

import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.models.consultation import Consultation
from notifications.services.presentation.whatsapp_status import get_consultation_delivery_whatsapp_status

logger = logging.getLogger(__name__)


def maybe_enqueue_consultation_whatsapp(
    *,
    consultation_id,
    initiated_by_id: str | None = None,
    base_url: str = "/",
) -> None:
    """Queue prepare task when consultation ended but no delivery row exists yet."""
    if not getattr(settings, "PRESCRIPTION_WHATSAPP_ASYNC", True):
        return
    if get_consultation_delivery_whatsapp_status(consultation_id):
        return
    try:
        from notifications.tasks import prepare_consultation_whatsapp

        prepare_consultation_whatsapp.delay(
            str(consultation_id),
            initiated_by_id,
            base_url,
        )
        logger.info("consultation_whatsapp_lazy_enqueued consultation_id=%s", consultation_id)
    except Exception:
        logger.exception("consultation_whatsapp_lazy_enqueue_failed consultation_id=%s", consultation_id)


class WhatsAppConsultationStatusAPIView(APIView):
    """GET /api/v1/notifications/whatsapp/status/consultation/<uuid:consultation_id>/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request, consultation_id):
        consultation = (
            Consultation.objects.select_related(
                "encounter",
                "encounter__doctor",
                "encounter__doctor__user",
            )
            .filter(pk=consultation_id)
            .first()
        )
        if consultation is None:
            return Response({"detail": "Consultation not found."}, status=status.HTTP_404_NOT_FOUND)

        doctor_user_id = consultation.encounter.doctor.user_id
        if doctor_user_id != request.user.id:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        enqueue = str(request.query_params.get("enqueue", "")).lower() in {"1", "true", "yes"}
        if enqueue and consultation.is_finalized:
            maybe_enqueue_consultation_whatsapp(
                consultation_id=consultation_id,
                initiated_by_id=str(request.user.pk),
                base_url=request.build_absolute_uri("/"),
            )

        payload = get_consultation_delivery_whatsapp_status(consultation)
        if payload is None:
            return Response({"status": None, "message": None}, status=status.HTTP_200_OK)
        return Response({"status": payload.get("status"), "message": payload}, status=status.HTTP_200_OK)
