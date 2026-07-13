"""Validate mandatory communication snapshots."""

from __future__ import annotations

from business_audit.communication.certification.certification_result import ValidatorResult
from business_audit.enums import BusinessAuditAction
from business_audit.models import BusinessAudit

_CHANNEL_ACTIONS = (
    BusinessAuditAction.REPORT_WHATSAPP_DELIVERY,
    BusinessAuditAction.REPORT_EMAIL_DELIVERY,
    BusinessAuditAction.REPORT_SMS_DELIVERY,
)


class SnapshotValidator:
    """Ensure decision snapshot on success and provider snapshot on failure."""

    def validate(self, audits: list[BusinessAudit]) -> ValidatorResult:
        errors: list[str] = []
        for row in audits:
            payload = (row.new_value or {}).get("payload") or {}
            if row.action in _CHANNEL_ACTIONS:
                if "decision_snapshot" not in payload:
                    errors.append(
                        f"attempt {row.workflow_instance_id}: missing decision_snapshot on channel delivery"
                    )
                if "provider_response_snapshot" not in payload:
                    errors.append(
                        f"attempt {row.workflow_instance_id}: missing provider_response_snapshot"
                    )
            if row.action == BusinessAuditAction.REPORT_DELIVERY_FAILED:
                if "provider_response_snapshot" not in payload:
                    errors.append(
                        f"attempt {row.workflow_instance_id}: missing provider_response_snapshot on failure"
                    )
            if row.action == BusinessAuditAction.REPORT_DELIVERY_RETRIED:
                if "channel_selection_snapshot" not in payload:
                    errors.append(
                        f"attempt {row.workflow_instance_id}: missing channel_selection_snapshot on retry"
                    )

        return ValidatorResult(
            name="snapshot",
            passed=not errors,
            errors=errors,
            metrics={"audited_events": len(audits)},
        )
