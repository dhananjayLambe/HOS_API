"""Communication certification orchestration."""

from __future__ import annotations

import time

from business_audit.communication.certification.certification_result import CertificationReport
from business_audit.communication.certification.constants import COMMUNICATION_CERTIFICATION_ACTIONS
from business_audit.communication.certification.correlation_validator import CorrelationValidator
from business_audit.communication.certification.snapshot_validator import SnapshotValidator
from business_audit.communication.certification.timeline_validator import TimelineValidator
from business_audit.communication.report.repository import ReportCommunicationAuditRepository
from business_audit.models import BusinessAudit


class CommunicationCertificationService:
    """Validate report communication audit records for a delivery journey."""

    def __init__(
        self,
        *,
        repository: ReportCommunicationAuditRepository | None = None,
    ) -> None:
        self._repo = repository or ReportCommunicationAuditRepository()
        self._timeline = TimelineValidator()
        self._snapshot = SnapshotValidator()
        self._correlation = CorrelationValidator()

    def certify(
        self,
        *,
        communication_id: str | None = None,
        correlation_id: str | None = None,
        booking_id: str | None = None,
    ) -> CertificationReport:
        start = time.perf_counter()

        if communication_id:
            audits = self._repo.get_by_communication(communication_id)
        elif booking_id:
            audits = self._repo.get_by_booking(booking_id)
        elif correlation_id:
            audits = list(
                BusinessAudit.objects.filter(correlation_id=correlation_id).order_by("created_at")
            )
        else:
            audits = []

        cert_audits = [row for row in audits if row.action in COMMUNICATION_CERTIFICATION_ACTIONS]

        attempt_ids = sorted(
            {
                str((row.new_value or {}).get("payload", {}).get("communication_attempt_id") or row.workflow_instance_id)
                for row in cert_audits
                if row.action != "report.ready"
            }
        )

        resolved_comm_id = communication_id
        if not resolved_comm_id and cert_audits:
            resolved_comm_id = str(cert_audits[0].resource_id)

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
                booking_id=booking_id,
            ),
        ]

        errors: list[str] = []
        for validator in validators:
            errors.extend(validator.errors)

        passed = all(v.passed for v in validators)
        duration_ms = (time.perf_counter() - start) * 1000

        return CertificationReport(
            passed=passed,
            communication_id=resolved_comm_id,
            correlation_id=correlation_id,
            attempt_ids=attempt_ids,
            event_count=len(cert_audits),
            timeline=timeline,
            validators=validators,
            duration_ms=duration_ms,
            errors=errors,
        )
