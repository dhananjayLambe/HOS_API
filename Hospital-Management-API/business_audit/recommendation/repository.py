"""Recommendation-scoped queries over business audit records."""

from __future__ import annotations

from business_audit.domain.repository import BusinessAuditRepository
from business_audit.enums import BusinessAuditAction, BusinessResourceType
from business_audit.models import BusinessAudit


class RecommendationAuditRepository:
    """Query helpers for recommendation workflow audits."""

    def __init__(self) -> None:
        self._repository = BusinessAuditRepository()

    def get_by_workflow(self, workflow_instance_id: str) -> list[BusinessAudit]:
        return self._repository.get_by_workflow_instance(workflow_instance_id)

    def get_by_recommendation(self, recommendation_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.RECOMMENDATION,
                resource_id=str(recommendation_id),
            ).order_by("sequence_no", "created_at")
        )

    def get_by_consultation(self, consultation_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.RECOMMENDATION,
                new_value__payload__consultation_id=str(consultation_id),
            ).order_by("created_at")
        )

    def get_by_patient(self, patient_account_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.RECOMMENDATION,
                new_value__payload__patient_account_id=str(patient_account_id),
            ).order_by("-created_at")
        )

    def get_by_provider_reference(self, provider_reference: str) -> list[BusinessAudit]:
        return self._repository.get_by_provider_reference(provider_reference)

    def has_action_for_recommendation(
        self,
        *,
        recommendation_id: str,
        action: BusinessAuditAction | str,
    ) -> bool:
        action_value = action.value if isinstance(action, BusinessAuditAction) else str(action)
        return BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.RECOMMENDATION,
            resource_id=str(recommendation_id),
            action=action_value,
        ).exists()

    def has_provider_reference(self, provider_reference: str) -> bool:
        if not provider_reference:
            return False
        return BusinessAudit.objects.filter(
            provider_reference=provider_reference,
        ).exists()

    def has_retry_event(
        self,
        *,
        recommendation_id: str,
        retry_count: int,
    ) -> bool:
        return BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.RECOMMENDATION,
            resource_id=str(recommendation_id),
            action=BusinessAuditAction.RECOMMENDATION_RETRIED,
            retry_count=retry_count,
        ).exists()
