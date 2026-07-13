"""Validate routing decision timeline integrity."""

from __future__ import annotations

from business_audit.decision.certification.certification_result import ValidatorResult
from business_audit.decision.certification.constants import (
    ROUTING_REQUIRED_STARTED,
    ROUTING_TERMINAL_ACTIONS,
)
from business_audit.enums import BusinessAuditAction
from business_audit.models import BusinessAudit


class TimelineValidator:
    """Ensure one started and one terminal event per decision_id."""

    def validate(self, audits: list[BusinessAudit]) -> ValidatorResult:
        errors: list[str] = []
        by_decision: dict[str, list[BusinessAudit]] = {}
        for row in audits:
            by_decision.setdefault(str(row.resource_id), []).append(row)

        for decision_id, rows in by_decision.items():
            actions = [row.action for row in rows]
            started = actions.count(ROUTING_REQUIRED_STARTED)
            if started != 1:
                errors.append(f"decision {decision_id}: expected 1 routing.started, got {started}")
            terminals = [a for a in actions if a in ROUTING_TERMINAL_ACTIONS]
            if len(terminals) != 1:
                errors.append(
                    f"decision {decision_id}: expected 1 terminal event, got {len(terminals)}"
                )
            if (
                BusinessAuditAction.ROUTING_LAB_ASSIGNED in terminals
                and BusinessAuditAction.ROUTING_FAILED in terminals
            ):
                errors.append(f"decision {decision_id}: both assigned and failed present")

        return ValidatorResult(
            name="timeline",
            passed=not errors,
            errors=errors,
            metrics={"decision_count": len(by_decision)},
        )
