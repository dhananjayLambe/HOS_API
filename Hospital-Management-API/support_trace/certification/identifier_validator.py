"""Identifier search certification validator."""

from __future__ import annotations

from support_trace.identifiers.identifier_lookup_service import IdentifierLookupService
from support_trace.lookup.workflow_lookup import WorkflowLookupDelegate


class IdentifierValidator:
    GOLDEN_PARTIAL = "9876543210"

    @classmethod
    def validate(cls, *, booking_id: str | None = None, correlation_id: str | None = None) -> tuple[list[str], float]:
        warnings: list[str] = []
        checks = 0
        passed = 0
        if booking_id:
            checks += 1
            result = IdentifierLookupService.lookup_booking(booking_id)
            if result.traces:
                passed += 1
            else:
                warnings.append("booking lookup returned no traces")
        if correlation_id:
            checks += 1
            lookup, _scope = WorkflowLookupDelegate.lookup_by_correlation(correlation_id)
            if lookup.traces:
                passed += 1
            else:
                warnings.append("correlation lookup returned no traces")
        if checks == 0:
            return ["no golden identifiers provided"], 0.0
        score = passed / checks
        return warnings, score
