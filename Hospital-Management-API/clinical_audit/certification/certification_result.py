"""Structured results for Clinical Audit certification."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ValidatorResult:
    """Pass/fail outcome for a single certification validator."""

    name: str
    passed: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CertificationReport:
    """Aggregated certification outcome for a consultation journey."""

    passed: bool
    correlation_id: str
    consultation_id: str | None
    patient_account_id: str | None
    event_count: int
    timeline: list[dict[str, Any]]
    validators: list[ValidatorResult]
    duration_ms: float
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "correlation_id": self.correlation_id,
            "consultation_id": self.consultation_id,
            "patient_account_id": self.patient_account_id,
            "event_count": self.event_count,
            "timeline": self.timeline,
            "duration_ms": self.duration_ms,
            "errors": self.errors,
            "validators": [
                {
                    "name": validator.name,
                    "passed": validator.passed,
                    "errors": validator.errors,
                    "warnings": validator.warnings,
                    "metrics": validator.metrics,
                }
                for validator in self.validators
            ],
        }
