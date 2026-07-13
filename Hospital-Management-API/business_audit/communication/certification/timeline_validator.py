"""Validate communication timeline integrity."""

from __future__ import annotations

from business_audit.communication.certification.certification_result import ValidatorResult
from business_audit.communication.certification.constants import (
    COMMUNICATION_REQUIRED_READY,
    COMMUNICATION_TERMINAL_ACTIONS,
)
from business_audit.enums import BusinessAuditAction
from business_audit.models import BusinessAudit


class TimelineValidator:
    """Ensure one report.ready and one terminal per communication_attempt_id."""

    def validate(self, audits: list[BusinessAudit]) -> ValidatorResult:
        errors: list[str] = []
        communication_ids = {str(row.resource_id) for row in audits}

        for comm_id in communication_ids:
            rows = [r for r in audits if str(r.resource_id) == comm_id]
            actions = [row.action for row in rows]
            ready_count = actions.count(COMMUNICATION_REQUIRED_READY)
            if ready_count != 1:
                errors.append(f"communication {comm_id}: expected 1 report.ready, got {ready_count}")

        by_attempt: dict[str, list[BusinessAudit]] = {}
        for row in audits:
            if row.action == BusinessAuditAction.REPORT_READY:
                continue
            payload = (row.new_value or {}).get("payload") or {}
            attempt_id = payload.get("communication_attempt_id") or row.workflow_instance_id
            if attempt_id:
                by_attempt.setdefault(str(attempt_id), []).append(row)

        for attempt_id, rows in by_attempt.items():
            actions = [row.action for row in rows]
            terminals = [a for a in actions if a in COMMUNICATION_TERMINAL_ACTIONS]
            if len(terminals) > 1:
                errors.append(
                    f"attempt {attempt_id}: expected at most 1 terminal event, got {len(terminals)}"
                )

        attempt_numbers = sorted(
            {
                (row.new_value or {}).get("payload", {}).get("attempt_number", 0)
                for row in audits
                if (row.new_value or {}).get("payload", {}).get("attempt_number")
            }
        )
        if attempt_numbers:
            expected = list(range(1, max(attempt_numbers) + 1))
            if attempt_numbers != expected:
                errors.append(
                    f"attempt_number sequence not contiguous: {attempt_numbers} vs {expected}"
                )

        return ValidatorResult(
            name="timeline",
            passed=not errors,
            errors=errors,
            metrics={"communication_count": len(communication_ids), "attempt_count": len(by_attempt)},
        )
