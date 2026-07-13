"""Validate correlation and workflow hierarchy for routing decisions."""

from __future__ import annotations

from business_audit.decision.certification.certification_result import ValidatorResult
from business_audit.enums import BusinessResourceType, WorkflowType
from business_audit.models import BusinessAudit


class CorrelationValidator:
    """Ensure shared correlation_id and valid workflow nesting."""

    def validate(
        self,
        audits: list[BusinessAudit],
        *,
        expected_correlation_id: str,
        booking_id: str | None = None,
    ) -> ValidatorResult:
        errors: list[str] = []
        warnings: list[str] = []

        corr_ids = {row.correlation_id for row in audits if row.correlation_id}
        if expected_correlation_id not in corr_ids and audits:
            errors.append(
                f"expected correlation_id {expected_correlation_id}, found {sorted(corr_ids)}"
            )
        if len(corr_ids) > 1:
            warnings.append(f"multiple correlation_ids in routing audits: {sorted(corr_ids)}")

        for row in audits:
            if row.workflow_type != WorkflowType.ROUTING:
                errors.append(f"audit {row.pk}: workflow_type must be Routing")
            if row.resource_type != BusinessResourceType.DECISION:
                errors.append(f"audit {row.pk}: resource_type must be Decision")
            if booking_id and row.parent_workflow_instance_id != str(booking_id):
                if row.new_value and (row.new_value.get("payload") or {}).get("booking_id") == str(
                    booking_id
                ):
                    warnings.append(
                        f"audit {row.pk}: parent_workflow_instance_id mismatch (payload ok)"
                    )
                else:
                    errors.append(
                        f"audit {row.pk}: parent_workflow_instance_id expected {booking_id}"
                    )

        return ValidatorResult(
            name="correlation",
            passed=not errors,
            errors=errors,
            warnings=warnings,
        )
