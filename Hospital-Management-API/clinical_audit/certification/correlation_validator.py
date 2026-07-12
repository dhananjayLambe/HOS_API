"""Correlation ID validation for Clinical Audit certification."""

from __future__ import annotations

from clinical_audit.certification.certification_result import ValidatorResult
from clinical_audit.models import ClinicalAudit


class CorrelationValidator:
    """Verify all audit rows share a single correlation ID."""

    name = "correlation"

    def validate(
        self,
        audits: list[ClinicalAudit],
        *,
        expected_correlation_id: str | None = None,
    ) -> ValidatorResult:
        errors: list[str] = []

        if not audits:
            errors.append("No audit rows to validate.")
            return ValidatorResult(name=self.name, passed=False, errors=errors)

        correlation_ids = {
            (audit.correlation_id or "").strip()
            for audit in audits
            if (audit.correlation_id or "").strip()
        }
        empty_rows = sum(1 for audit in audits if not (audit.correlation_id or "").strip())
        if empty_rows:
            errors.append(f"{empty_rows} audit row(s) have empty correlation_id.")

        if len(correlation_ids) > 1:
            errors.append(
                f"Multiple correlation IDs found: {sorted(correlation_ids)}."
            )

        if expected_correlation_id:
            expected = expected_correlation_id.strip()
            if correlation_ids and expected not in correlation_ids:
                errors.append(
                    f"Expected correlation_id {expected}, found {sorted(correlation_ids)}."
                )

        return ValidatorResult(
            name=self.name,
            passed=not errors,
            errors=errors,
            metrics={"correlation_ids": sorted(correlation_ids)},
        )
