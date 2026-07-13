"""Report communication audit query helpers."""

from __future__ import annotations

from business_audit.enums import BusinessAuditAction, BusinessResourceType
from business_audit.models import BusinessAudit


class ReportCommunicationAuditRepository:
    """Query helpers for report communication audits."""

    _CHANNEL_ACTIONS = (
        BusinessAuditAction.REPORT_WHATSAPP_DELIVERY,
        BusinessAuditAction.REPORT_EMAIL_DELIVERY,
        BusinessAuditAction.REPORT_SMS_DELIVERY,
        BusinessAuditAction.REPORT_PORTAL_DELIVERY,
    )

    def get_by_communication(self, communication_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.COMMUNICATION,
                resource_id=str(communication_id),
            ).order_by("sequence_no", "created_at")
        )

    def get_by_attempt(self, communication_attempt_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                workflow_instance_id=str(communication_attempt_id),
            ).order_by("sequence_no", "created_at")
        )

    def get_by_report(self, report_id: str) -> list[BusinessAudit]:
        return self.get_by_communication(str(report_id))

    def get_by_booking(self, booking_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                new_value__payload__booking_id=str(booking_id),
            ).order_by("created_at")
        )

    def get_by_channel(self, channel: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.COMMUNICATION,
                new_value__payload__selected_channel=str(channel).upper(),
            ).order_by("-created_at")
        )

    def get_by_provider(self, provider: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.COMMUNICATION,
                new_value__payload__decision_snapshot__provider=str(provider),
            ).order_by("-created_at")
        )

    def get_by_provider_reference(self, provider_reference: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                provider_reference=str(provider_reference),
            ).order_by("-created_at")
        )

    def get_failed_communications(self) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.COMMUNICATION,
                action=BusinessAuditAction.REPORT_DELIVERY_FAILED,
            ).order_by("-created_at")
        )

    def get_retry_communications(self) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.COMMUNICATION,
                action=BusinessAuditAction.REPORT_DELIVERY_RETRIED,
            ).order_by("-created_at")
        )

    def get_by_patient(self, patient_account_id: str) -> list[BusinessAudit]:
        return list(
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.COMMUNICATION,
                new_value__payload__patient_account_id=str(patient_account_id),
            ).order_by("-created_at")
        )

    def get_latest_attempt_for_communication(self, communication_id: str) -> BusinessAudit | None:
        return (
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.COMMUNICATION,
                resource_id=str(communication_id),
                action__in=(
                    BusinessAuditAction.REPORT_DELIVERY_REQUESTED,
                    *self._CHANNEL_ACTIONS,
                    BusinessAuditAction.REPORT_DELIVERY_FAILED,
                ),
            )
            .order_by("-sequence_no", "-created_at")
            .first()
        )

    def reconstruct_attempt_timeline(self, communication_id: str) -> list[dict]:
        audits = self.get_by_communication(communication_id)
        timeline: list[dict] = []
        seen_attempts: set[tuple[str, int]] = set()

        for row in audits:
            payload = (row.new_value or {}).get("payload") or {}
            attempt_id = payload.get("communication_attempt_id") or row.workflow_instance_id
            if not attempt_id:
                continue
            if row.action not in (
                *self._CHANNEL_ACTIONS,
                BusinessAuditAction.REPORT_DELIVERY_FAILED,
                BusinessAuditAction.REPORT_DELIVERY_RETRIED,
            ):
                continue
            channel = payload.get("selected_channel", "")
            status = "QUEUED"
            if row.action in self._CHANNEL_ACTIONS:
                status = "DELIVERED"
            elif row.action == BusinessAuditAction.REPORT_DELIVERY_FAILED:
                status = "FAILED"
            elif row.action == BusinessAuditAction.REPORT_DELIVERY_RETRIED:
                status = "RETRY"
            attempt_number = payload.get("attempt_number", len(timeline) + 1)
            key = (str(attempt_id), attempt_number)
            if key in seen_attempts:
                continue
            seen_attempts.add(key)
            timeline.append(
                {
                    "attempt_number": attempt_number,
                    "channel": channel,
                    "status": status,
                    "communication_attempt_id": str(attempt_id),
                }
            )

        timeline.sort(key=lambda e: e.get("attempt_number", 0))
        return timeline

    def has_action_for_communication(
        self,
        *,
        communication_id: str,
        action: BusinessAuditAction | str,
    ) -> bool:
        action_value = action.value if isinstance(action, BusinessAuditAction) else str(action)
        return BusinessAudit.objects.filter(
            resource_type=BusinessResourceType.COMMUNICATION,
            resource_id=str(communication_id),
            action=action_value,
        ).exists()

    def has_action_for_attempt(
        self,
        *,
        communication_attempt_id: str,
        action: BusinessAuditAction | str,
    ) -> bool:
        action_value = action.value if isinstance(action, BusinessAuditAction) else str(action)
        return BusinessAudit.objects.filter(
            workflow_instance_id=str(communication_attempt_id),
            action=action_value,
        ).exists()

    def has_channel_delivery_for_attempt(
        self,
        *,
        communication_attempt_id: str,
        provider_reference: str,
    ) -> bool:
        return BusinessAudit.objects.filter(
            workflow_instance_id=str(communication_attempt_id),
            action__in=self._CHANNEL_ACTIONS,
            provider_reference=str(provider_reference),
        ).exists()

    def has_retry_for_parent(
        self,
        *,
        parent_attempt_id: str,
        retry_number: int,
    ) -> bool:
        return BusinessAudit.objects.filter(
            action=BusinessAuditAction.REPORT_DELIVERY_RETRIED,
            new_value__payload__parent_communication_attempt_id=str(parent_attempt_id),
            new_value__payload__attempt_number=retry_number,
        ).exists()

    def current_macro_state(self, communication_id: str) -> str | None:
        row = (
            BusinessAudit.objects.filter(
                resource_type=BusinessResourceType.COMMUNICATION,
                resource_id=str(communication_id),
            )
            .order_by("-sequence_no", "-created_at")
            .first()
        )
        if row is None:
            return None
        return row.state_after

    def current_attempt_state(self, communication_attempt_id: str) -> str | None:
        row = (
            BusinessAudit.objects.filter(
                workflow_instance_id=str(communication_attempt_id),
            )
            .order_by("-sequence_no", "-created_at")
            .first()
        )
        if row is None:
            return None
        return row.state_after
