"""Recommendation business audit integration hooks."""

from __future__ import annotations

import logging

from business_audit.domain.context import apply_workflow_context
from business_audit.recommendation.constants import (
    SOURCE_PATH_MARKETPLACE_API,
    SOURCE_PATH_WHATSAPP_ORCHESTRATOR,
)
from business_audit.recommendation.recommendation_audit_service import (
    RecommendationAuditService,
)
from consultations_core.audit.commit import emit_after_commit

logger = logging.getLogger(__name__)


def _apply_recommendation_workflow(recommendation_id) -> None:
    apply_workflow_context(workflow_instance_id=str(recommendation_id))


def schedule_recommendation_business_generated(
    *,
    consultation,
    recommendation_id,
    result,
    user=None,
    source_path: str = SOURCE_PATH_MARKETPLACE_API,
    expires_at: str | None = None,
    request_id: str | None = None,
) -> None:
    try:
        _apply_recommendation_workflow(recommendation_id)
        emit_after_commit(
            RecommendationAuditService.emit_generated,
            consultation,
            recommendation_id,
            result,
            user=user,
            source_path=source_path,
            expires_at=expires_at,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "recommendation_business_generated_schedule_failed",
            exc_info=True,
            extra={"recommendation_id": str(recommendation_id)},
        )


def schedule_recommendation_business_queued(
    *,
    consultation,
    recommendation_id,
    whatsapp_message,
) -> None:
    try:
        _apply_recommendation_workflow(recommendation_id)
        emit_after_commit(
            RecommendationAuditService.emit_queued,
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=whatsapp_message,
        )
    except Exception:
        logger.warning(
            "recommendation_business_queued_schedule_failed",
            exc_info=True,
            extra={"recommendation_id": str(recommendation_id)},
        )


def schedule_recommendation_business_sent(
    *,
    consultation,
    recommendation_id,
    whatsapp_message,
    meta_message_id: str,
    execution_time_ms: int | None = None,
) -> None:
    try:
        _apply_recommendation_workflow(recommendation_id)
        emit_after_commit(
            RecommendationAuditService.emit_sent,
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=whatsapp_message,
            meta_message_id=meta_message_id,
            execution_time_ms=execution_time_ms,
        )
    except Exception:
        logger.warning(
            "recommendation_business_sent_schedule_failed",
            exc_info=True,
            extra={"recommendation_id": str(recommendation_id)},
        )


def schedule_recommendation_business_delivered(
    *,
    consultation,
    recommendation_id,
    whatsapp_message,
    meta_message_id: str,
) -> None:
    try:
        _apply_recommendation_workflow(recommendation_id)
        emit_after_commit(
            RecommendationAuditService.emit_delivered,
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=whatsapp_message,
            meta_message_id=meta_message_id,
        )
    except Exception:
        logger.warning(
            "recommendation_business_delivered_schedule_failed",
            exc_info=True,
            extra={"recommendation_id": str(recommendation_id)},
        )


def schedule_recommendation_business_read(
    *,
    consultation,
    recommendation_id,
    whatsapp_message,
    meta_message_id: str,
) -> None:
    try:
        _apply_recommendation_workflow(recommendation_id)
        emit_after_commit(
            RecommendationAuditService.emit_read,
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=whatsapp_message,
            meta_message_id=meta_message_id,
        )
    except Exception:
        logger.warning(
            "recommendation_business_read_schedule_failed",
            exc_info=True,
            extra={"recommendation_id": str(recommendation_id)},
        )


def schedule_recommendation_business_failed(
    *,
    consultation,
    recommendation_id,
    whatsapp_message=None,
    failure_reason: str,
    provider_response_code: str | None = None,
    prior_status: str | None = None,
    meta_message_id: str | None = None,
    actor_type=None,
) -> None:
    try:
        _apply_recommendation_workflow(recommendation_id)
        kwargs = {
            "consultation": consultation,
            "recommendation_id": recommendation_id,
            "whatsapp_message": whatsapp_message,
            "failure_reason": failure_reason,
            "provider_response_code": provider_response_code,
            "prior_status": prior_status,
            "meta_message_id": meta_message_id,
        }
        if actor_type is not None:
            kwargs["actor_type"] = actor_type
        emit_after_commit(RecommendationAuditService.emit_failed, **kwargs)
    except Exception:
        logger.warning(
            "recommendation_business_failed_schedule_failed",
            exc_info=True,
            extra={"recommendation_id": str(recommendation_id)},
        )


def schedule_recommendation_business_retried(
    *,
    consultation,
    recommendation_id,
    whatsapp_message=None,
    retry_count: int,
    retry_reason: str | None = None,
    prior_status: str | None = None,
    prior_retry_count: int | None = None,
    max_retry: int | None = None,
) -> None:
    try:
        _apply_recommendation_workflow(recommendation_id)
        emit_after_commit(
            RecommendationAuditService.emit_retried,
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=whatsapp_message,
            retry_count=retry_count,
            retry_reason=retry_reason,
            prior_status=prior_status,
            prior_retry_count=prior_retry_count,
            max_retry=max_retry,
        )
    except Exception:
        logger.warning(
            "recommendation_business_retried_schedule_failed",
            exc_info=True,
            extra={"recommendation_id": str(recommendation_id)},
        )


def schedule_recommendation_business_expired(
    *,
    consultation,
    recommendation_id,
    expires_at: str,
    whatsapp_message=None,
    message_status: str | None = None,
) -> None:
    try:
        _apply_recommendation_workflow(recommendation_id)
        emit_after_commit(
            RecommendationAuditService.emit_expired,
            consultation=consultation,
            recommendation_id=recommendation_id,
            expires_at=expires_at,
            whatsapp_message=whatsapp_message,
            message_status=message_status,
        )
    except Exception:
        logger.warning(
            "recommendation_business_expired_schedule_failed",
            exc_info=True,
            extra={"recommendation_id": str(recommendation_id)},
        )
