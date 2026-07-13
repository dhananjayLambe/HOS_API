"""Booking-scoped queries over business audit records."""

from __future__ import annotations

from business_audit.domain.repository import BusinessAuditRepository
from business_audit.enums import BusinessAuditAction, BusinessResourceType
from business_audit.models import BusinessAudit


class BookingAuditRepository:
    """Query helpers for booking workflow audits."""

    def __init__(self) -> None:
        self._repository = BusinessAuditRepository()

    def get_by_workflow(self, workflow_instance_id: str) -> list[BusinessAudit]:
        return self._repository.get_by_workflow_instance(workflow_instance_id)

    def get_by_booking(self, booking_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.BOOKING,
                resource_id=str(booking_id),
            ).order_by("sequence_no", "created_at")
        )

    def get_by_consultation(self, consultation_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.BOOKING,
                new_value__payload__consultation_id=str(consultation_id),
            ).order_by("created_at")
        )

    def get_by_patient(self, patient_account_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.BOOKING,
                new_value__payload__patient_account_id=str(patient_account_id),
            ).order_by("-created_at")
        )

    def get_by_lab(self, *, laboratory_id: str | None = None, branch_id: str | None = None) -> list[BusinessAudit]:
        qs = BusinessAudit.objects.filter(resource_type=BusinessResourceType.BOOKING)
        if laboratory_id:
            qs = qs.filter(new_value__payload__laboratory_id=str(laboratory_id))
        if branch_id:
            qs = qs.filter(new_value__payload__branch_id=str(branch_id))
        return list(qs.order_by("-created_at"))

    def get_by_slot(self, *, date: str, time: str | None = None) -> list[BusinessAudit]:
        qs = BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.BOOKING,
            new_value__payload__slot__date=str(date),
        )
        if time is not None:
            qs = qs.filter(new_value__payload__slot__time=str(time))
        return list(qs.order_by("-created_at"))

    def get_by_collection_mode(self, mode: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.BOOKING,
                new_value__payload__collection_mode=str(mode),
            ).order_by("-created_at")
        )

    def has_action_for_booking(
        self,
        *,
        booking_id: str,
        action: BusinessAuditAction | str,
    ) -> bool:
        action_value = action.value if isinstance(action, BusinessAuditAction) else str(action)
        return BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(booking_id),
            action=action_value,
        ).exists()

    def count_modified_events(self, booking_id: str) -> int:
        return BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(booking_id),
            action=BusinessAuditAction.BOOKING_MODIFIED,
        ).count()

    def next_modification_version(self, booking_id: str) -> int:
        return self.count_modified_events(booking_id) + 1

    def has_modification_version(self, *, booking_id: str, version: int) -> bool:
        return BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(booking_id),
            action=BusinessAuditAction.BOOKING_MODIFIED,
            new_value__payload__modification_version=version,
        ).exists()

    def current_macro_state(self, booking_id: str) -> str | None:
        row = (
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.BOOKING,
                resource_id=str(booking_id),
            )
            .order_by("-sequence_no", "-created_at")
            .first()
        )
        if row is None:
            return None
        return row.state_after
