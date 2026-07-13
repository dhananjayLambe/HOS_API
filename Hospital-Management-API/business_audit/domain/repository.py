"""Append-only persistence for Business Audit records."""

from __future__ import annotations

from uuid import UUID

from business_audit.models import BusinessAudit
from shared.audit.base_repository import AppendOnlyAuditRepository


class BusinessAuditRepository(AppendOnlyAuditRepository):
    """Database access for business audit records."""

    def __init__(self) -> None:
        super().__init__(BusinessAudit)

    def get_by_workflow_instance(
        self, workflow_instance_id: str
    ) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                workflow_instance_id=workflow_instance_id
            ).order_by("sequence_no")
        )

    def filter_by_parent_workflow(
        self, parent_workflow_instance_id: str
    ) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                parent_workflow_instance_id=parent_workflow_instance_id
            ).order_by("created_at")
        )

    def get_by_correlation(self, correlation_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(correlation_id=correlation_id).order_by(
                "created_at"
            )
        )

    def get_by_provider_reference(
        self, provider_reference: str
    ) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                provider_reference=provider_reference
            ).order_by("-created_at")
        )

    def filter_by_domain(self, domain: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(domain=domain).order_by("-created_at")
        )

    def filter_by_category(self, category: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(category=category).order_by("-created_at")
        )

    def filter_by_status(self, status: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(status=status).order_by("-created_at")
        )

    def max_sequence_no(self, workflow_instance_id: str) -> int:
        from django.db.models import Max

        result = BusinessAudit.objects.filter(
            workflow_instance_id=workflow_instance_id
        ).aggregate(max_seq=Max("sequence_no"))
        return int(result["max_seq"] or 0)

    def get_by_event_id(self, event_id: UUID | str) -> BusinessAudit | None:
        try:
            return BusinessAudit.objects.get(pk=event_id)
        except BusinessAudit.DoesNotExist:
            return None
