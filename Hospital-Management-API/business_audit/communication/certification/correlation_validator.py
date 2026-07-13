"""Validate correlation across nested workflows."""

from __future__ import annotations

from business_audit.communication.certification.certification_result import ValidatorResult
from business_audit.models import BusinessAudit


class CorrelationValidator:
    """Ensure shared correlation_id across communication events."""

    def validate(
        self,
        audits: list[BusinessAudit],
        *,
        expected_correlation_id: str | None = None,
        booking_id: str | None = None,
    ) -> ValidatorResult:
        errors: list[str] = []
        correlation_ids = {row.correlation_id for row in audits if row.correlation_id}
        if expected_correlation_id:
            if correlation_ids and expected_correlation_id not in correlation_ids:
                errors.append(
                    f"expected correlation_id {expected_correlation_id}, got {correlation_ids}"
                )
            if len(correlation_ids) > 1:
                errors.append(f"multiple correlation_ids in communication audit: {correlation_ids}")

        if booking_id:
            for row in audits:
                payload = (row.new_value or {}).get("payload") or {}
                payload_booking = payload.get("booking_id")
                if payload_booking and str(payload_booking) != str(booking_id):
                    errors.append(
                        f"booking_id mismatch on {row.action}: {payload_booking} vs {booking_id}"
                    )

        return ValidatorResult(
            name="correlation",
            passed=not errors,
            errors=errors,
            metrics={"correlation_id_count": len(correlation_ids)},
        )
