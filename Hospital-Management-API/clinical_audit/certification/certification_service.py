"""Clinical Audit certification orchestration service."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from clinical_audit.certification.certification_result import CertificationReport
from clinical_audit.certification.constants import CERTIFICATION_REQUIRED_ACTIONS
from clinical_audit.certification.correlation_validator import CorrelationValidator
from clinical_audit.certification.immutability_validator import ImmutabilityValidator
from clinical_audit.certification.payload_validator import PayloadValidator
from clinical_audit.certification.performance_validator import PerformanceValidator
from clinical_audit.certification.timeline_validator import TimelineValidator
from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.models import ClinicalAudit


class ClinicalAuditCertificationService:
    """Validate existing ClinicalAudit records without modifying business data."""

    def __init__(self, repository: ClinicalAuditRepository | None = None) -> None:
        self._repository = repository or ClinicalAuditRepository()
        self._timeline = TimelineValidator()
        self._correlation = CorrelationValidator()
        self._payload = PayloadValidator()
        self._immutability = ImmutabilityValidator()
        self._performance = PerformanceValidator()

    def certify(
        self,
        *,
        correlation_id: str,
        consultation_id: str | None = None,
        patient_account_id: str | None = None,
        expected_timeline_path: str | Path | None = None,
        include_performance: bool = False,
    ) -> CertificationReport:
        start = time.perf_counter()

        audits = self._repository.get_by_correlation_id(correlation_id)
        if consultation_id:
            consultation_key = str(consultation_id)
            audits = [
                row
                for row in audits
                if not (row.consultation_id or "").strip()
                or str(row.consultation_id) == consultation_key
            ]

        if expected_timeline_path:
            self._validate_expected_timeline(expected_timeline_path, audits)

        cert_audits = [
            audit for audit in audits if audit.action in CERTIFICATION_REQUIRED_ACTIONS
        ]
        resolved_consultation_id = consultation_id or self._resolve_consultation_id(
            cert_audits
        )
        resolved_patient_id = patient_account_id or self._resolve_patient_id(cert_audits)

        timeline = [
            {
                "timestamp": audit.timestamp.isoformat(),
                "action": str(audit.action),
                "event": audit.event,
                "resource_type": audit.resource_type,
                "resource_id": audit.resource_id,
                "user_id": audit.user_id,
            }
            for audit in sorted(cert_audits, key=lambda row: row.timestamp)
        ]

        validators = [
            self._timeline.validate(
                audits,
                consultation_id=resolved_consultation_id,
                patient_account_id=resolved_patient_id,
            ),
            self._correlation.validate(
                audits,
                expected_correlation_id=correlation_id,
            ),
            self._payload.validate(audits),
            self._immutability.validate(audits),
        ]

        if include_performance:
            validators.append(
                self._performance.validate(
                    audits,
                    correlation_id=correlation_id,
                    certification_runner=lambda: self._run_core_validators(
                        audits,
                        correlation_id=correlation_id,
                        consultation_id=resolved_consultation_id,
                        patient_account_id=resolved_patient_id,
                    ),
                )
            )

        duration_ms = (time.perf_counter() - start) * 1000
        errors = [error for validator in validators for error in validator.errors]
        passed = all(validator.passed for validator in validators)

        return CertificationReport(
            passed=passed,
            correlation_id=correlation_id,
            consultation_id=resolved_consultation_id,
            patient_account_id=resolved_patient_id,
            event_count=len(cert_audits),
            timeline=timeline,
            validators=validators,
            duration_ms=round(duration_ms, 3),
            errors=errors,
        )

    def _run_core_validators(
        self,
        audits: list[ClinicalAudit],
        *,
        correlation_id: str,
        consultation_id: str | None,
        patient_account_id: str | None,
    ) -> None:
        self._timeline.validate(
            audits,
            consultation_id=consultation_id,
            patient_account_id=patient_account_id,
        )
        self._correlation.validate(audits, expected_correlation_id=correlation_id)
        self._payload.validate(audits)
        self._immutability.validate(audits)

    def _resolve_consultation_id(self, audits: list[ClinicalAudit]) -> str | None:
        for audit in audits:
            if audit.consultation_id:
                return str(audit.consultation_id)
        return None

    def _resolve_patient_id(self, audits: list[ClinicalAudit]) -> str | None:
        for audit in audits:
            if audit.patient_account_id:
                return str(audit.patient_account_id)
        return None

    def _validate_expected_timeline(
        self, expected_timeline_path: str | Path, audits: list[ClinicalAudit]
    ) -> None:
        path = Path(expected_timeline_path)
        payload: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
        expected_actions = payload.get("required_actions") or payload.get("events") or []
        if not expected_actions:
            return
        actual_actions = [
            str(audit.action)
            for audit in sorted(audits, key=lambda row: row.timestamp)
            if str(audit.action) in {str(action) for action in expected_actions}
        ]
        normalized_expected = [str(action) for action in expected_actions]
        if actual_actions != normalized_expected:
            raise ValueError(
                "Actual certification timeline does not match fixture: "
                f"expected={normalized_expected}, actual={actual_actions}"
            )
