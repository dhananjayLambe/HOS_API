"""Facade for recommendation operational business audit events."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from business_audit.domain.context import apply_workflow_context
from business_audit.domain.types import BusinessAuditResult
from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    ExternalProvider,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.recommendation.constants import (
    DOMAIN_DIAGNOSTICS,
    DOMAIN_NOTIFICATIONS,
    OPERATION_EXPIRE,
    OPERATION_POST_RECOMMENDATION,
    OPERATION_PREPARE_DELIVERY,
    OPERATION_RECOMMEND,
    OPERATION_SEND_MESSAGE,
    OPERATION_WEBHOOK_STATUS,
    SERVICE_EXPIRATION,
    SERVICE_LAB_RECOMMENDATION,
    SERVICE_MARKETPLACE_API,
    SERVICE_WHATSAPP,
    SOURCE_PATH_MARKETPLACE_API,
    SOURCE_PATH_WHATSAPP_ORCHESTRATOR,
)
from business_audit.recommendation.payload_builder import RecommendationPayloadBuilder
from business_audit.recommendation.repository import RecommendationAuditRepository
from business_audit.recommendation.snapshot_builder import RecommendationSnapshotBuilder
from business_audit.services import BusinessAuditService

logger = logging.getLogger(__name__)


class RecommendationAuditService:
    """Translate recommendation lifecycle events into BusinessAuditService.record()."""

    _repository = RecommendationAuditRepository()

    @classmethod
    def emit_generated(
        cls,
        consultation,
        recommendation_id,
        result,
        *,
        user=None,
        source_path: str = SOURCE_PATH_MARKETPLACE_API,
        expires_at: str | None = None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        resource_id = str(recommendation_id)
        if cls._repository.has_action_for_recommendation(
            recommendation_id=resource_id,
            action=BusinessAuditAction.RECOMMENDATION_GENERATED,
        ):
            return None

        encounter = consultation.encounter
        apply_workflow_context(workflow_instance_id=resource_id)

        available = bool(getattr(result, "available", False)) if result is not None else False
        payload = RecommendationPayloadBuilder.build_generated(
            recommendation_id=resource_id,
            consultation_id=str(consultation.id),
            patient_account_id=str(encounter.patient_account_id),
            patient_profile_id=str(encounter.patient_profile_id),
            encounter_id=str(encounter.id),
            result=result,
            source_path=source_path,
            expires_at=expires_at,
        )

        domain = DOMAIN_DIAGNOSTICS
        service = (
            SERVICE_MARKETPLACE_API
            if source_path == SOURCE_PATH_MARKETPLACE_API
            else SERVICE_LAB_RECOMMENDATION
        )
        operation = (
            OPERATION_POST_RECOMMENDATION
            if source_path == SOURCE_PATH_MARKETPLACE_API
            else OPERATION_RECOMMEND
        )

        return cls._record(
            action=BusinessAuditAction.RECOMMENDATION_GENERATED,
            event="Recommendation generated",
            recommendation_id=resource_id,
            organization_id=str(encounter.clinic_id),
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED if available else WorkflowStatus.FAILED,
            outcome=WorkflowOutcome.SUCCESS if available else WorkflowOutcome.FAILURE,
            state_before=None,
            state_after="Generated",
            domain=domain,
            service=service,
            operation=operation,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            execution_time_ms=getattr(result, "duration_ms", None) if result else None,
            external_provider=ExternalProvider.INTERNAL,
        )

    @classmethod
    def emit_queued(
        cls,
        *,
        consultation,
        recommendation_id,
        whatsapp_message,
        correlation_id: str | None = None,
    ) -> BusinessAuditResult | None:
        resource_id = str(recommendation_id)
        message_id = str(whatsapp_message.id)
        if cls._repository.has_provider_reference(f"queue:{message_id}"):
            return None

        encounter = consultation.encounter
        payload_data = whatsapp_message.request_payload or {}
        metadata = payload_data.get("recommendation_metadata") or {}
        payload = RecommendationPayloadBuilder.build_queued(
            recommendation_id=resource_id,
            consultation_id=str(consultation.id),
            patient_account_id=str(encounter.patient_account_id),
            patient_profile_id=str(encounter.patient_profile_id),
            encounter_id=str(encounter.id),
            whatsapp_message_id=message_id,
            variant=payload_data.get("variant"),
            recommendation_metadata=metadata,
        )

        return cls._record(
            action=BusinessAuditAction.WORKFLOW_QUEUED,
            event="WhatsApp recommendation queued",
            recommendation_id=resource_id,
            organization_id=str(encounter.clinic_id),
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.QUEUED,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before="Generated",
            state_after="Queued",
            domain=DOMAIN_NOTIFICATIONS,
            service=SERVICE_WHATSAPP,
            operation=OPERATION_PREPARE_DELIVERY,
            payload=payload,
            correlation_id=correlation_id,
            provider_reference=f"queue:{message_id}",
        )

    @classmethod
    def emit_sent(
        cls,
        *,
        consultation,
        recommendation_id,
        whatsapp_message,
        meta_message_id: str,
        execution_time_ms: int | None = None,
        correlation_id: str | None = None,
    ) -> BusinessAuditResult | None:
        resource_id = str(recommendation_id)
        if cls._repository.has_provider_reference(meta_message_id):
            return None

        encounter = consultation.encounter
        payload_data = whatsapp_message.request_payload or {}
        payload = RecommendationPayloadBuilder.build_sent(
            recommendation_id=resource_id,
            consultation_id=str(consultation.id),
            patient_account_id=str(encounter.patient_account_id),
            patient_profile_id=str(encounter.patient_profile_id),
            encounter_id=str(encounter.id),
            whatsapp_message_id=str(whatsapp_message.id),
            meta_message_id=meta_message_id,
            variant=payload_data.get("variant"),
            template_name=whatsapp_message.template_name,
            execution_time_ms=execution_time_ms,
        )

        return cls._record(
            action=BusinessAuditAction.RECOMMENDATION_SENT,
            event="Recommendation sent to Meta",
            recommendation_id=resource_id,
            organization_id=str(encounter.clinic_id),
            actor_type=ActorType.CELERY,
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.SUCCESS,
            state_before="Queued",
            state_after="Sent",
            domain=DOMAIN_NOTIFICATIONS,
            service=SERVICE_WHATSAPP,
            operation=OPERATION_SEND_MESSAGE,
            payload=payload,
            correlation_id=correlation_id,
            execution_time_ms=execution_time_ms,
            external_provider=ExternalProvider.META,
            provider_reference=meta_message_id,
            provider_response_code="200",
            provider_response_message="Meta accepted message",
        )

    @classmethod
    def emit_delivered(
        cls,
        *,
        consultation,
        recommendation_id,
        whatsapp_message,
        meta_message_id: str,
        correlation_id: str | None = None,
    ) -> BusinessAuditResult | None:
        provider_ref = f"{meta_message_id}:delivered"
        if cls._repository.has_provider_reference(provider_ref):
            return None
        return cls._emit_delivery_status(
            action=BusinessAuditAction.RECOMMENDATION_DELIVERED,
            event="Recommendation delivered",
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=whatsapp_message,
            meta_message_id=meta_message_id,
            provider_status="delivered",
            provider_reference=provider_ref,
            state_before="Sent",
            state_after="Delivered",
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_read(
        cls,
        *,
        consultation,
        recommendation_id,
        whatsapp_message,
        meta_message_id: str,
        correlation_id: str | None = None,
    ) -> BusinessAuditResult | None:
        provider_ref = f"{meta_message_id}:read"
        if cls._repository.has_provider_reference(provider_ref):
            return None
        return cls._emit_delivery_status(
            action=BusinessAuditAction.RECOMMENDATION_READ,
            event="Recommendation read",
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=whatsapp_message,
            meta_message_id=meta_message_id,
            provider_status="read",
            provider_reference=provider_ref,
            state_before="Delivered",
            state_after="Read",
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_failed(
        cls,
        *,
        consultation,
        recommendation_id,
        whatsapp_message=None,
        failure_reason: str,
        provider_response_code: str | None = None,
        prior_status: str | None = None,
        meta_message_id: str | None = None,
        actor_type: ActorType = ActorType.CELERY,
        correlation_id: str | None = None,
    ) -> BusinessAuditResult | None:
        resource_id = str(recommendation_id)
        provider_ref = meta_message_id or (
            f"failed:{whatsapp_message.id}" if whatsapp_message is not None else None
        )
        if provider_ref and cls._repository.has_provider_reference(
            f"{provider_ref}:{provider_response_code or 'unknown'}"
        ):
            return None

        encounter = consultation.encounter
        message_id = str(whatsapp_message.id) if whatsapp_message is not None else None
        payload = RecommendationPayloadBuilder.build_failed(
            recommendation_id=resource_id,
            consultation_id=str(consultation.id),
            patient_account_id=str(encounter.patient_account_id),
            patient_profile_id=str(encounter.patient_profile_id),
            encounter_id=str(encounter.id),
            whatsapp_message_id=message_id,
            failure_reason=failure_reason,
            provider_response_code=provider_response_code,
            meta_message_id=meta_message_id,
            prior_status=prior_status,
        )
        state_before, state_after = RecommendationSnapshotBuilder.failed_state(
            prior_status=prior_status or "Running"
        )

        return cls._record(
            action=BusinessAuditAction.RECOMMENDATION_FAILED,
            event="Recommendation delivery failed",
            recommendation_id=resource_id,
            organization_id=str(encounter.clinic_id),
            actor_type=actor_type,
            status=WorkflowStatus.FAILED,
            outcome=WorkflowOutcome.FAILURE,
            state_before=state_before,
            state_after=state_after,
            domain=DOMAIN_NOTIFICATIONS,
            service=SERVICE_WHATSAPP,
            operation=OPERATION_SEND_MESSAGE,
            payload=payload,
            correlation_id=correlation_id,
            external_provider=ExternalProvider.META,
            provider_reference=(
                f"{provider_ref}:{provider_response_code or 'unknown'}"
                if provider_ref
                else None
            ),
            provider_response_code=provider_response_code,
            provider_response_message=failure_reason,
        )

    @classmethod
    def emit_retried(
        cls,
        *,
        consultation,
        recommendation_id,
        whatsapp_message=None,
        retry_count: int,
        retry_reason: str | None = None,
        prior_status: str | None = None,
        prior_retry_count: int | None = None,
        max_retry: int | None = None,
        correlation_id: str | None = None,
    ) -> BusinessAuditResult | None:
        resource_id = str(recommendation_id)
        if cls._repository.has_retry_event(
            recommendation_id=resource_id,
            retry_count=retry_count,
        ):
            return None

        encounter = consultation.encounter
        message_id = str(whatsapp_message.id) if whatsapp_message is not None else None
        payload = RecommendationPayloadBuilder.build_retried(
            recommendation_id=resource_id,
            consultation_id=str(consultation.id),
            patient_account_id=str(encounter.patient_account_id),
            patient_profile_id=str(encounter.patient_profile_id),
            encounter_id=str(encounter.id),
            whatsapp_message_id=message_id,
            retry_count=retry_count,
            retry_reason=retry_reason,
            prior_status=prior_status,
            prior_retry_count=prior_retry_count,
        )
        state_before, state_after = RecommendationSnapshotBuilder.retry_state(
            prior_status=prior_status,
            prior_retry_count=prior_retry_count,
        )

        return cls._record(
            action=BusinessAuditAction.RECOMMENDATION_RETRIED,
            event="Recommendation delivery retried",
            recommendation_id=resource_id,
            organization_id=str(encounter.clinic_id),
            actor_type=ActorType.CELERY,
            status=WorkflowStatus.RETRYING,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before=state_before,
            state_after=state_after,
            domain=DOMAIN_NOTIFICATIONS,
            service=SERVICE_WHATSAPP,
            operation=OPERATION_SEND_MESSAGE,
            payload=payload,
            correlation_id=correlation_id,
            retry_count=retry_count,
            max_retry=max_retry,
            retry_reason=retry_reason,
        )

    @classmethod
    def emit_expired(
        cls,
        *,
        consultation,
        recommendation_id,
        expires_at: str,
        whatsapp_message=None,
        message_status: str | None = None,
        correlation_id: str | None = None,
    ) -> BusinessAuditResult | None:
        resource_id = str(recommendation_id)
        if cls._repository.has_action_for_recommendation(
            recommendation_id=resource_id,
            action=BusinessAuditAction.RECOMMENDATION_EXPIRED,
        ):
            return None

        encounter = consultation.encounter
        message_id = str(whatsapp_message.id) if whatsapp_message is not None else None
        payload = RecommendationPayloadBuilder.build_expired(
            recommendation_id=resource_id,
            consultation_id=str(consultation.id),
            patient_account_id=str(encounter.patient_account_id),
            patient_profile_id=str(encounter.patient_profile_id),
            encounter_id=str(encounter.id),
            expires_at=expires_at,
            whatsapp_message_id=message_id,
            message_status=message_status,
        )

        return cls._record(
            action=BusinessAuditAction.RECOMMENDATION_EXPIRED,
            event="Recommendation expired",
            recommendation_id=resource_id,
            organization_id=str(encounter.clinic_id),
            actor_type=ActorType.SCHEDULER,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.FAILURE,
            state_before="Active",
            state_after="Expired",
            domain=DOMAIN_NOTIFICATIONS,
            service=SERVICE_EXPIRATION,
            operation=OPERATION_EXPIRE,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def _emit_delivery_status(
        cls,
        *,
        action: BusinessAuditAction,
        event: str,
        consultation,
        recommendation_id,
        whatsapp_message,
        meta_message_id: str,
        provider_status: str,
        provider_reference: str,
        state_before: str,
        state_after: str,
        correlation_id: str | None,
    ) -> BusinessAuditResult | None:
        resource_id = str(recommendation_id)
        encounter = consultation.encounter
        payload = RecommendationPayloadBuilder.build_delivery_status(
            recommendation_id=resource_id,
            consultation_id=str(consultation.id),
            patient_account_id=str(encounter.patient_account_id),
            patient_profile_id=str(encounter.patient_profile_id),
            encounter_id=str(encounter.id),
            whatsapp_message_id=str(whatsapp_message.id),
            meta_message_id=meta_message_id,
            provider_status=provider_status,
            template_name=whatsapp_message.template_name,
        )

        return cls._record(
            action=action,
            event=event,
            recommendation_id=resource_id,
            organization_id=str(encounter.clinic_id),
            actor_type=ActorType.WEBHOOK,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=state_before,
            state_after=state_after,
            domain=DOMAIN_NOTIFICATIONS,
            service=SERVICE_WHATSAPP,
            operation=OPERATION_WEBHOOK_STATUS,
            payload=payload,
            correlation_id=correlation_id,
            external_provider=ExternalProvider.META,
            provider_reference=provider_reference,
            provider_response_code=provider_status,
        )

    @classmethod
    def _record(
        cls,
        *,
        action: BusinessAuditAction,
        event: str,
        recommendation_id: str,
        organization_id: str,
        actor_type: ActorType,
        status: WorkflowStatus,
        outcome: WorkflowOutcome,
        domain: str,
        service: str,
        operation: str,
        payload: dict[str, Any],
        state_before: str | None = None,
        state_after: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
        execution_time_ms: int | None = None,
        retry_count: int = 0,
        max_retry: int | None = None,
        retry_reason: str | None = None,
        external_provider: ExternalProvider | None = None,
        provider_reference: str | None = None,
        provider_response_code: str | None = None,
        provider_response_message: str | None = None,
    ) -> BusinessAuditResult:
        user_id = None
        if user is not None and getattr(user, "is_authenticated", False):
            user_id = str(getattr(user, "pk", ""))

        apply_workflow_context(workflow_instance_id=str(recommendation_id))

        return BusinessAuditService.record(
            action=action,
            event=event,
            workflow_type=WorkflowType.RECOMMENDATION,
            workflow_instance_id=str(recommendation_id),
            category=EventCategory.RECOMMENDATION,
            domain=domain,
            service=service,
            operation=operation,
            resource_type=BusinessResourceType.RECOMMENDATION,
            resource_id=str(recommendation_id),
            organization_id=organization_id,
            status=status,
            outcome=outcome,
            actor_type=actor_type,
            state_before=state_before,
            state_after=state_after,
            user_id=user_id,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            execution_time_ms=execution_time_ms,
            retry_count=retry_count,
            max_retry=max_retry,
            retry_reason=retry_reason,
            external_provider=external_provider,
            provider_reference=provider_reference,
            provider_response_code=provider_response_code,
            provider_response_message=provider_response_message,
        )

    @classmethod
    def resolve_consultation_from_message(cls, message) -> Any | None:
        if message.prescription is not None:
            return message.prescription.consultation
        encounter = getattr(message, "encounter", None)
        if encounter is not None:
            from consultations_core.models.consultation import Consultation

            return (
                Consultation.objects.select_related("encounter")
                .filter(encounter_id=encounter.id)
                .first()
            )
        payload = message.request_payload or {}
        consultation_id = payload.get("consultation_id")
        if consultation_id:
            from consultations_core.models.consultation import Consultation

            return (
                Consultation.objects.select_related("encounter")
                .filter(pk=consultation_id)
                .first()
            )
        return None
