"""Ops monitoring for diagnostic recommendation WhatsApp."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctor
from consultations_core.models.consultation import Consultation
from notifications.models.whatsapp_notifications import WhatsAppMessage, WhatsAppMessageType
from notifications.services.monitoring.recommendation_metrics import (
    get_recommendation_whatsapp_metrics,
    serialize_recommendation_message,
)


class RecommendationWhatsAppMetricsAPIView(APIView):
    """GET /api/v1/notifications/whatsapp/recommendations/metrics/?days=7"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 7))
        except (TypeError, ValueError):
            days = 7
        return Response(get_recommendation_whatsapp_metrics(days=days))


class RecommendationConsultationStatusAPIView(APIView):
    """GET /api/v1/notifications/whatsapp/recommendations/consultation/<uuid:consultation_id>/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request, consultation_id):
        consultation = (
            Consultation.objects.select_related("encounter", "encounter__doctor", "encounter__doctor__user")
            .filter(pk=consultation_id)
            .first()
        )
        if consultation is None:
            return Response({"detail": "Consultation not found."}, status=404)
        if consultation.encounter.doctor.user_id != request.user.id:
            return Response({"detail": "Not authorized."}, status=403)

        message = (
            WhatsAppMessage.objects.filter(
                message_type=WhatsAppMessageType.TEST_BOOKING,
                is_deleted=False,
                idempotency_key=f"diagnostic_recommendation_{consultation_id}",
            )
            .order_by("-created_at")
            .first()
        )
        if message is None:
            return Response({"status": None, "message": None})
        return Response(
            {
                "status": (message.status or "").lower(),
                "message": serialize_recommendation_message(message),
            }
        )
