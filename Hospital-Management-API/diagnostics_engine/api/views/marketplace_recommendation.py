"""Marketplace Recommendation Platform API view."""

from __future__ import annotations

import logging
import time
import uuid

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDiagnosticOrderOrchestrationActor
from consultations_core.models.consultation import Consultation
from diagnostics_engine.api.serializers.marketplace_recommendation import (
    FAILURE_MESSAGES,
    MarketplaceRecommendationRequestSerializer,
    MarketplaceRecommendationResponseBuilder,
)
from diagnostics_engine.domain.recommendation import LabRecommendationService
from diagnostics_engine.monitoring.request_context import resolve_request_id
from diagnostics_engine.services.marketplace_recommendation_audit import (
    emit_recommendation_metrics,
    record_marketplace_recommendation_audit,
)
from consultations_core.audit import schedule_recommendation_generated
from diagnostics_engine.services.recommendation_access import resolve_consultation_access

logger = logging.getLogger(__name__)


class MarketplaceRecommendationRateThrottle(UserRateThrottle):
    rate = "20/min"


class MarketplaceRecommendationView(APIView):
    """
    POST /api/v1/marketplace/diagnostics/recommendations/

    Thin transport over LabRecommendationService — no routing, booking, or pricing logic.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDiagnosticOrderOrchestrationActor]
    throttle_classes = [MarketplaceRecommendationRateThrottle]

    @swagger_auto_schema(
        operation_summary="Get diagnostics marketplace laboratory recommendation",
        operation_description=(
            "Returns the best laboratory recommendation for a consultation before booking. "
            "Read-only — does not create orders or trigger routing."
        ),
        request_body=MarketplaceRecommendationRequestSerializer,
        responses={
            200: openapi.Response("Recommendation available"),
            400: openapi.Response("Validation or business failure"),
            403: openapi.Response("Permission denied"),
            404: openapi.Response("Consultation not found"),
            409: openapi.Response("No eligible laboratory or pricing failure"),
        },
        security=[{"Bearer": []}],
    )
    def post(self, request):
        recommendation_id = uuid.uuid4()
        request_id = resolve_request_id(request.headers.get("X-Request-ID"))
        started = time.monotonic()
        client_request_id: str | None = None
        consultation_id = None

        ser = MarketplaceRecommendationRequestSerializer(data=request.data)
        if not ser.is_valid():
            duration_ms = int((time.monotonic() - started) * 1000)
            client_request_id = (request.data or {}).get("client_request_id")
            payload, http_status = MarketplaceRecommendationResponseBuilder.error_envelope(
                code="VALIDATION_ERROR",
                message="; ".join(
                    f"{k}: {v[0] if isinstance(v, list) else v}"
                    for k, v in ser.errors.items()
                ),
                next_action="CONTACT_SUPPORT",
                http_status=status.HTTP_400_BAD_REQUEST,
                recommendation_id=recommendation_id,
                request_id=request_id,
                client_request_id=client_request_id,
                duration_ms=duration_ms,
            )
            record_marketplace_recommendation_audit(
                request=request,
                recommendation_id=recommendation_id,
                request_id=request_id,
                client_request_id=client_request_id,
                consultation_id=uuid.UUID(int=0),
                http_status=http_status,
                available=False,
                failure_reason="VALIDATION_ERROR",
                duration_ms=duration_ms,
            )
            return Response(payload, status=http_status)

        consultation_id = ser.validated_data["consultation_id"]
        client_request_id = ser.validated_data.get("client_request_id") or None

        consultation = (
            Consultation.objects.select_related(
                "encounter",
                "encounter__clinic",
                "encounter__doctor",
                "encounter__doctor__user",
                "encounter__patient_profile",
            )
            .filter(pk=consultation_id)
            .first()
        )
        if consultation is None:
            duration_ms = int((time.monotonic() - started) * 1000)
            payload, http_status = MarketplaceRecommendationResponseBuilder.error_envelope(
                code="CONSULTATION_NOT_FOUND",
                message=FAILURE_MESSAGES["CONSULTATION_NOT_FOUND"],
                next_action="CONTACT_SUPPORT",
                http_status=status.HTTP_404_NOT_FOUND,
                recommendation_id=recommendation_id,
                request_id=request_id,
                client_request_id=client_request_id,
                consultation_id=consultation_id,
                duration_ms=duration_ms,
            )
            record_marketplace_recommendation_audit(
                request=request,
                recommendation_id=recommendation_id,
                request_id=request_id,
                client_request_id=client_request_id,
                consultation_id=consultation_id,
                http_status=http_status,
                available=False,
                failure_reason="CONSULTATION_NOT_FOUND",
                duration_ms=duration_ms,
            )
            return Response(payload, status=http_status)

        if not resolve_consultation_access(request, consultation):
            duration_ms = int((time.monotonic() - started) * 1000)
            logger.info(
                "recommendation.api.failed request_id=%s consultation_id=%s failure_reason=PERMISSION_DENIED",
                request_id,
                consultation_id,
            )
            payload, http_status = MarketplaceRecommendationResponseBuilder.error_envelope(
                code="PERMISSION_DENIED",
                message=FAILURE_MESSAGES["PERMISSION_DENIED"],
                next_action="CONTACT_SUPPORT",
                http_status=status.HTTP_403_FORBIDDEN,
                recommendation_id=recommendation_id,
                request_id=request_id,
                client_request_id=client_request_id,
                consultation_id=consultation_id,
                duration_ms=duration_ms,
            )
            record_marketplace_recommendation_audit(
                request=request,
                recommendation_id=recommendation_id,
                request_id=request_id,
                client_request_id=client_request_id,
                consultation_id=consultation_id,
                http_status=http_status,
                available=False,
                failure_reason="PERMISSION_DENIED",
                duration_ms=duration_ms,
            )
            return Response(payload, status=http_status)

        logger.info(
            "recommendation.api.started request_id=%s consultation_id=%s user_id=%s",
            request_id,
            consultation_id,
            getattr(request.user, "pk", None),
        )

        try:
            result = LabRecommendationService.recommend(consultation=consultation)
        except Exception:
            duration_ms = int((time.monotonic() - started) * 1000)
            logger.exception(
                "recommendation.api.failed request_id=%s consultation_id=%s failure_reason=INTERNAL_ERROR",
                request_id,
                consultation_id,
            )
            payload, http_status = MarketplaceRecommendationResponseBuilder.error_envelope(
                code="INTERNAL_ERROR",
                message=FAILURE_MESSAGES["INTERNAL_ERROR"],
                next_action="CONTACT_SUPPORT",
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                recommendation_id=recommendation_id,
                request_id=request_id,
                client_request_id=client_request_id,
                consultation_id=consultation_id,
                duration_ms=duration_ms,
            )
            record_marketplace_recommendation_audit(
                request=request,
                recommendation_id=recommendation_id,
                request_id=request_id,
                client_request_id=client_request_id,
                consultation_id=consultation_id,
                http_status=http_status,
                available=False,
                failure_reason="INTERNAL_ERROR",
                duration_ms=duration_ms,
            )
            return Response(payload, status=http_status)

        duration_ms = int((time.monotonic() - started) * 1000)
        payload, http_status = MarketplaceRecommendationResponseBuilder.from_result(
            result,
            recommendation_id=recommendation_id,
            request_id=request_id,
            client_request_id=client_request_id,
            duration_ms=duration_ms,
            generated_at=result.generated_at,
        )

        branch_id = str(result.recommended_branch.pk) if result.recommended_branch else None

        if result.available:
            logger.info(
                "recommendation.api.completed request_id=%s recommendation_id=%s consultation_id=%s "
                "available=true duration_ms=%s branch_id=%s",
                request_id,
                recommendation_id,
                consultation_id,
                duration_ms,
                branch_id,
            )
            schedule_recommendation_generated(
                consultation=consultation,
                user=request.user,
                recommendation_id=recommendation_id,
                result=result,
            )
        else:
            logger.info(
                "recommendation.api.failed request_id=%s recommendation_id=%s consultation_id=%s "
                "failure_reason=%s http_status=%s duration_ms=%s",
                request_id,
                recommendation_id,
                consultation_id,
                result.failure_reason,
                http_status,
                duration_ms,
            )

        emit_recommendation_metrics(
            available=result.available,
            failure_reason=result.failure_reason,
            duration_ms=duration_ms,
            quoted_price=payload.get("recommendation", {}).get("quoted_price"),
            branch_id=branch_id,
        )

        record_marketplace_recommendation_audit(
            request=request,
            recommendation_id=recommendation_id,
            request_id=request_id,
            client_request_id=client_request_id,
            consultation_id=consultation_id,
            http_status=http_status,
            available=result.available,
            failure_reason=result.failure_reason,
            duration_ms=duration_ms,
        )

        return Response(payload, status=http_status)
