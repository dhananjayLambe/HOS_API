"""Routing decision audit query helpers."""

from __future__ import annotations

from business_audit.domain.repository import BusinessAuditRepository
from business_audit.enums import BusinessAuditAction, BusinessResourceType
from business_audit.models import BusinessAudit


class RoutingAuditRepository:
    """Query helpers for routing decision audits."""

    def __init__(self) -> None:
        self._repository = BusinessAuditRepository()

    def get_by_decision(self, decision_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.DECISION,
                resource_id=str(decision_id),
            ).order_by("sequence_no", "created_at")
        )

    def get_by_routing(self, routing_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                workflow_instance_id=str(routing_id),
            ).order_by("sequence_no", "created_at")
        )

    def get_by_booking(self, booking_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                parent_workflow_instance_id=str(booking_id),
                new_value__payload__booking_id=str(booking_id),
            ).order_by("created_at")
        )

    def get_by_lab(
        self,
        *,
        laboratory_id: str | None = None,
        branch_id: str | None = None,
    ) -> list[BusinessAudit]:
        qs = BusinessAudit.objects.filter(resource_type=BusinessResourceType.DECISION)
        if laboratory_id:
            qs = qs.filter(
                new_value__payload__decision_snapshot__selected_lab_id=str(laboratory_id)
            )
        if branch_id:
            qs = qs.filter(
                new_value__payload__decision_snapshot__selected_branch_id=str(branch_id)
            )
        return list(qs.order_by("-created_at"))

    def get_by_rule(
        self,
        *,
        rule_id: str | None = None,
        rule_version: str | None = None,
    ) -> list[BusinessAudit]:
        qs = BusinessAudit.objects.filter(resource_type=BusinessResourceType.DECISION)
        if rule_id:
            qs = qs.filter(new_value__payload__decision_snapshot__rule_id=str(rule_id))
        if rule_version:
            qs = qs.filter(new_value__payload__decision_snapshot__rule_version=str(rule_version))
        return list(qs.order_by("-created_at"))

    def get_by_marketplace(self, marketplace: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.DECISION,
                new_value__payload__decision_snapshot__provider_response__marketplace=str(
                    marketplace
                ),
            ).order_by("-created_at")
        )

    def get_by_collection_mode(self, mode: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.DECISION,
                new_value__payload__collection_mode=str(mode),
            ).order_by("-created_at")
        )

    def get_failed_decisions(self) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.DECISION,
                action=BusinessAuditAction.ROUTING_FAILED,
            ).order_by("-created_at")
        )

    def get_manual_overrides(self) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.DECISION,
                action=BusinessAuditAction.ROUTING_MANUAL_OVERRIDE,
            ).order_by("-created_at")
        )

    def get_latest_decision_for_routing(self, routing_id: str) -> BusinessAudit | None:
        return (
            BusinessAudit.objects.filter(
                workflow_instance_id=str(routing_id),
                resource_type=BusinessResourceType.DECISION,
            )
            .order_by("-sequence_no", "-created_at")
            .first()
        )

    def has_action_for_decision(
        self,
        *,
        decision_id: str,
        action: BusinessAuditAction | str,
    ) -> bool:
        action_value = action.value if isinstance(action, BusinessAuditAction) else str(action)
        return BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.DECISION,
            resource_id=str(decision_id),
            action=action_value,
        ).exists()

    def has_manual_override_version(self, *, decision_id: str, version: int) -> bool:
        return BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.DECISION,
            resource_id=str(decision_id),
            action=BusinessAuditAction.ROUTING_MANUAL_OVERRIDE,
            new_value__payload__override_version=version,
        ).exists()

    def next_override_version(self, decision_id: str) -> int:
        count = BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.DECISION,
            resource_id=str(decision_id),
            action=BusinessAuditAction.ROUTING_MANUAL_OVERRIDE,
        ).count()
        return count + 1

    def current_macro_state(self, decision_id: str) -> str | None:
        row = (
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.DECISION,
                resource_id=str(decision_id),
            )
            .order_by("-sequence_no", "-created_at")
            .first()
        )
        if row is None:
            return None
        return row.state_after
