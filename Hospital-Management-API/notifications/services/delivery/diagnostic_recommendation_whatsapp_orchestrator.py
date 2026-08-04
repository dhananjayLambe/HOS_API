"""Background orchestration for diagnostic recommendation WhatsApp (M4.3/4.4)."""

from __future__ import annotations

import time
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

from business_audit.domain.context import apply_workflow_context
from business_audit.recommendation.hooks import schedule_recommendation_business_generated
from consultations_core.models.consultation import Consultation
from consultations_core.models.prescription import Prescription, PrescriptionStatus
from diagnostics_engine.domain.investigation_resolution import load_convertible_investigation_items
from diagnostics_engine.domain.recommendation import LabRecommendationService
from notifications.models.whatsapp_notifications import WhatsAppMessageStatus
from notifications.services.delivery.whatsapp_service import WhatsAppService
from shared.logging import LogModule, logger


def _consultation_queryset():
    return (
        Consultation.objects.select_related(
            "encounter",
            "encounter__patient_profile",
            "encounter__patient_account",
            "encounter__patient_account__user",
            "encounter__clinic",
            "encounter__doctor",
        )
        .prefetch_related(
            "prescriptions__lines",
            "investigations__items",
        )
    )


def _recommendation_ttl_seconds() -> int:
    return int(getattr(settings, "MARKETPLACE_RECOMMENDATION_TTL_SECONDS", 900))


def _log_recommendation_event(
    event: str,
    *,
    consultation_id,
    recommendation_available: bool | None = None,
    laboratory_id=None,
    branch_id=None,
    quoted_price=None,
    collection_mode: str | None = None,
    template_name: str | None = None,
    whatsapp_message_id=None,
    execution_time_ms: int | None = None,
    failure_reason: str | None = None,
) -> None:
    logger.info(
        f"Recommendation {event}",
        module=LogModule.WHATSAPP,
        action=f"whatsapp.{event}",
        metadata={
            "consultation_id": str(consultation_id),
            "recommendation_available": recommendation_available,
            "laboratory_id": str(laboratory_id) if laboratory_id is not None else None,
            "branch_id": str(branch_id) if branch_id is not None else None,
            "quoted_price": str(quoted_price) if quoted_price is not None else None,
            "collection_mode": collection_mode,
            "template_name": template_name,
            "whatsapp_message_id": str(whatsapp_message_id) if whatsapp_message_id is not None else None,
            "execution_time_ms": execution_time_ms,
            "failure_reason": failure_reason,
        },
    )


def run_prepare_and_enqueue(
    *,
    consultation_id: str,
    prescription_message_id: str | None = None,
) -> str | None:
    """
    Call LabRecommendationService and queue WhatsApp send when investigations exist.

    Returns message_id when send should be chained, else None.
    """
    started = time.monotonic()
    try:
        consultation = _consultation_queryset().filter(pk=consultation_id).first()
        if consultation is None:
            logger.warning(
                "Recommendation skipped — consultation missing",
                module=LogModule.WHATSAPP,
                action="whatsapp.recommendation.skipped",
                metadata={"consultation_id": consultation_id, "reason": "consultation_missing"},
            )
            return None

        _log_recommendation_event("recommendation.started", consultation_id=consultation_id)

        try:
            load_convertible_investigation_items(consultation)
        except ValidationError:
            _log_recommendation_event(
                "recommendation.skipped",
                consultation_id=consultation_id,
                recommendation_available=None,
                execution_time_ms=int((time.monotonic() - started) * 1000),
                failure_reason="NO_CONVERTIBLE_INVESTIGATIONS",
            )
            return None

        _log_recommendation_event("recommendation.prepare", consultation_id=consultation_id)

        result = LabRecommendationService.recommend(consultation=consultation)
        recommendation_id = uuid.uuid4()
        apply_workflow_context(workflow_instance_id=str(recommendation_id))
        now = timezone.now()
        ttl = _recommendation_ttl_seconds()
        expires_at = now + timedelta(seconds=ttl)

        schedule_recommendation_business_generated(
            consultation=consultation,
            recommendation_id=recommendation_id,
            result=result,
            user=None,
            source_path="whatsapp_orchestrator",
            expires_at=expires_at.isoformat(),
        )

        prescription = (
            Prescription.objects.filter(
                consultation_id=consultation_id,
                is_active=True,
                status=PrescriptionStatus.FINALIZED,
            )
            .order_by("-finalized_at")
            .first()
        )

        if result.available:
            _log_recommendation_event(
                "recommendation.generated",
                consultation_id=consultation_id,
                recommendation_available=True,
                laboratory_id=getattr(result.recommended_lab, "pk", None),
                branch_id=getattr(result.recommended_branch, "pk", None),
                quoted_price=result.quoted_price,
                collection_mode=result.collection_mode,
                execution_time_ms=int((time.monotonic() - started) * 1000),
            )
        else:
            _log_recommendation_event(
                "recommendation.generated",
                consultation_id=consultation_id,
                recommendation_available=False,
                collection_mode=result.collection_mode,
                execution_time_ms=int((time.monotonic() - started) * 1000),
                failure_reason=result.failure_reason,
            )

        recommended_branch = result.recommended_branch
        recommendation_metadata = {
            "recommendation_id": str(recommendation_id),
            "generated_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "expires_in_seconds": ttl,
            "recommended_branch": {
                "id": str(recommended_branch.pk),
                "name": getattr(recommended_branch, "branch_name", "") or "",
                "code": getattr(recommended_branch, "branch_code", "") or "",
            }
            if recommended_branch
            else None,
            "quoted_price": str(result.quoted_price) if result.quoted_price is not None else None,
            "collection_mode": result.collection_mode,
            "mrp_total": str(result.mrp_total) if result.mrp_total is not None else None,
            "savings": str(result.savings) if result.savings is not None else None,
        }

        if result.available:
            _log_recommendation_event(
                "recommendation.available",
                consultation_id=consultation_id,
                recommendation_available=True,
                laboratory_id=getattr(result.recommended_lab, "pk", None),
                branch_id=getattr(result.recommended_branch, "pk", None),
                quoted_price=result.quoted_price,
                collection_mode=result.collection_mode,
                execution_time_ms=int((time.monotonic() - started) * 1000),
            )
        else:
            _log_recommendation_event(
                "recommendation.unavailable",
                consultation_id=consultation_id,
                recommendation_available=False,
                collection_mode=result.collection_mode,
                execution_time_ms=int((time.monotonic() - started) * 1000),
                failure_reason=result.failure_reason,
            )

        message = WhatsAppService().prepare_recommendation_delivery(
            consultation=consultation,
            prescription=prescription,
            recommendation_result=result,
            recommendation_id=recommendation_id,
            recommendation_metadata=recommendation_metadata,
            prescription_message_id=prescription_message_id,
        )
        if message.status == WhatsAppMessageStatus.QUEUED:
            return str(message.id)
        return None
    except Exception:
        _log_recommendation_event(
            "recommendation.failed",
            consultation_id=consultation_id,
            recommendation_available=None,
            execution_time_ms=int((time.monotonic() - started) * 1000),
            failure_reason="PREPARE_EXCEPTION",
        )
        logger.exception(
            "Diagnostic recommendation WhatsApp prepare failed",
            module=LogModule.WHATSAPP,
            action="whatsapp.recommendation.prepare_failed",
            metadata={"consultation_id": consultation_id},
        )
        raise
