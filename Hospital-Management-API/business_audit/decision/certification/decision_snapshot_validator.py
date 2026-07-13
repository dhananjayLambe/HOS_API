"""Validate mandatory decision snapshot on terminal routing events."""

from __future__ import annotations

from business_audit.decision.certification.certification_result import ValidatorResult
from business_audit.enums import BusinessAuditAction
from business_audit.models import BusinessAudit


class DecisionSnapshotValidator:
    """Ensure decision_snapshot exists on lab_assigned and manual_override."""

    def validate(self, audits: list[BusinessAudit]) -> ValidatorResult:
        errors: list[str] = []
        snapshot_required = {
            BusinessAuditAction.ROUTING_LAB_ASSIGNED,
            BusinessAuditAction.ROUTING_MANUAL_OVERRIDE,
        }
        for row in audits:
            if row.action not in snapshot_required:
                continue
            payload = (row.new_value or {}).get("payload") or {}
            snapshot = payload.get("decision_snapshot")
            if not snapshot:
                errors.append(
                    f"decision {row.resource_id}: missing decision_snapshot on {row.action}"
                )
                continue
            if not snapshot.get("selected_branch_id") and row.action == BusinessAuditAction.ROUTING_LAB_ASSIGNED:
                errors.append(
                    f"decision {row.resource_id}: snapshot missing selected_branch_id"
                )
            candidates = snapshot.get("candidate_labs") or []
            if row.action == BusinessAuditAction.ROUTING_LAB_ASSIGNED and not candidates:
                errors.append(f"decision {row.resource_id}: snapshot has no candidate_labs")

        return ValidatorResult(name="decision_snapshot", passed=not errors, errors=errors)
