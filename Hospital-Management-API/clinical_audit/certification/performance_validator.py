"""Performance validation for Clinical Audit certification."""

from __future__ import annotations

import time
from typing import Callable
from uuid import uuid4

from clinical_audit.certification.certification_result import ValidatorResult
from clinical_audit.certification.constants import (
    PERF_TARGET_AUDIT_WRITE_MS,
    PERF_TARGET_CERTIFICATION_MS,
    PERF_TARGET_TIMELINE_RECONSTRUCTION_MS,
)
from clinical_audit.constants import META_KEY
from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from clinical_audit.models import ClinicalAudit
from clinical_audit.services.clinical_audit_service import ClinicalAuditService


class PerformanceValidator:
    """Measure audit write, timeline reconstruction, and certification runtime."""

    name = "performance"

    def validate(
        self,
        audits: list[ClinicalAudit],
        *,
        correlation_id: str,
        certification_runner: Callable[[], None] | None = None,
    ) -> ValidatorResult:
        errors: list[str] = []
        metrics: dict[str, float] = {}

        repository = ClinicalAuditRepository()

        start = time.perf_counter()
        repository.get_by_correlation_id(correlation_id)
        timeline_ms = (time.perf_counter() - start) * 1000
        metrics["timeline_reconstruction_ms"] = round(timeline_ms, 3)
        if timeline_ms > PERF_TARGET_TIMELINE_RECONSTRUCTION_MS:
            errors.append(
                f"Timeline reconstruction {timeline_ms:.2f}ms exceeds "
                f"{PERF_TARGET_TIMELINE_RECONSTRUCTION_MS}ms target."
            )

        if certification_runner is not None:
            start = time.perf_counter()
            certification_runner()
            certification_ms = (time.perf_counter() - start) * 1000
            metrics["certification_runtime_ms"] = round(certification_ms, 3)
            if certification_ms > PERF_TARGET_CERTIFICATION_MS:
                errors.append(
                    f"Certification runtime {certification_ms:.2f}ms exceeds "
                    f"{PERF_TARGET_CERTIFICATION_MS}ms target."
                )

        if audits:
            organization_id = "perf-org"
            first = audits[0]
            if isinstance(first.new_value, dict):
                meta = first.new_value.get(META_KEY)
                if isinstance(meta, dict) and meta.get("organization_id"):
                    organization_id = str(meta["organization_id"])

            start = time.perf_counter()
            result = ClinicalAuditService.record(
                action=AuditAction.CONSULTATION_STARTED,
                event=AuditAction.CONSULTATION_STARTED.label,
                resource_type=ClinicalEntity.CONSULTATION,
                resource_id=first.consultation_id or "perf-consultation",
                source=AuditSource.DOCTOR,
                user_id=first.user_id or "perf-user",
                organization_id=organization_id,
                patient_account_id=first.patient_account_id,
                consultation_id=first.consultation_id,
                correlation_id=str(uuid4()),
                validate_references=False,
            )
            write_ms = (time.perf_counter() - start) * 1000
            metrics["audit_write_ms"] = round(write_ms, 3)
            if not result.success:
                errors.append(f"Performance audit write failed: {result.error}.")
            elif write_ms > PERF_TARGET_AUDIT_WRITE_MS:
                errors.append(
                    f"Audit write {write_ms:.2f}ms exceeds "
                    f"{PERF_TARGET_AUDIT_WRITE_MS}ms target."
                )

        return ValidatorResult(
            name=self.name,
            passed=not errors,
            errors=errors,
            metrics=metrics,
        )
