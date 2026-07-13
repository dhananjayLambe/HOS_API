"""Routing decision certification orchestration."""

from __future__ import annotations

import time

from business_audit.decision.certification.certification_result import CertificationReport
from business_audit.decision.certification.constants import ROUTING_CERTIFICATION_ACTIONS
from business_audit.decision.certification.correlation_validator import CorrelationValidator
from business_audit.decision.certification.decision_snapshot_validator import DecisionSnapshotValidator
from business_audit.decision.certification.timeline_validator import TimelineValidator
from business_audit.decision.routing.repository import RoutingAuditRepository
from business_audit.domain.repository import BusinessAuditRepository
from business_audit.models import BusinessAudit


class RoutingDecisionCertificationService:
    """Validate routing decision audit records for a booking journey."""

    def __init__(
        self,
        *,
        routing_repository: RoutingAuditRepository | None = None,
        audit_repository: BusinessAuditRepository | None = None,
    ) -> None:
        self._routing_repo = routing_repository or RoutingAuditRepository()
        self._audit_repo = audit_repository or BusinessAuditRepository()
        self._timeline = TimelineValidator()
        self._snapshot = DecisionSnapshotValidator()
        self._correlation = CorrelationValidator()

    def certify(
        self,
        *,
        correlation_id: str,
        booking_id: str | None = None,
        decision_id: str | None = None,
    ) -> CertificationReport:
        start = time.perf_counter()

        if decision_id:
            audits = self._routing_repo.get_by_decision(decision_id)
        elif booking_id:
            audits = self._routing_repo.get_by_booking(booking_id)
        else:
            audits = list(
                BusinessAudit.objects.filter(correlation_id=correlation_id).order_by("created_at")
            )

        cert_audits = [row for row in audits if row.action in ROUTING_CERTIFICATION_ACTIONS]
        if booking_id:
            cert_audits = [
                row
                for row in cert_audits
                if (row.new_value or {}).get("payload", {}).get("booking_id") in (
                    str(booking_id),
                    None,
                )
                or row.parent_workflow_instance_id == str(booking_id)
            ]

        decision_ids = sorted({str(row.resource_id) for row in cert_audits})
        resolved_booking = booking_id
        if not resolved_booking and cert_audits:
            payload = (cert_audits[0].new_value or {}).get("payload") or {}
            resolved_booking = payload.get("booking_id")

        timeline = [
            {
                "timestamp": row.created_at.isoformat(),
                "action": str(row.action),
                "event": row.event,
                "resource_id": row.resource_id,
                "workflow_instance_id": row.workflow_instance_id,
            }
            for row in sorted(cert_audits, key=lambda r: r.created_at)
        ]

        validators = [
            self._timeline.validate(cert_audits),
            self._snapshot.validate(cert_audits),
            self._correlation.validate(
                cert_audits,
                expected_correlation_id=correlation_id,
                booking_id=resolved_booking,
            ),
        ]

        errors: list[str] = []
        for validator in validators:
            errors.extend(validator.errors)

        passed = all(v.passed for v in validators)
        duration_ms = (time.perf_counter() - start) * 1000

        return CertificationReport(
            passed=passed,
            correlation_id=correlation_id,
            booking_id=resolved_booking,
            decision_ids=decision_ids,
            event_count=len(cert_audits),
            timeline=timeline,
            validators=validators,
            duration_ms=duration_ms,
            errors=errors,
        )
