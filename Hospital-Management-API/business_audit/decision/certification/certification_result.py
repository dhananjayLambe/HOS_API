"""Certification result types for routing decision audits."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ValidatorResult:
    name: str
    passed: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CertificationReport:
    passed: bool
    correlation_id: str
    booking_id: str | None
    decision_ids: list[str]
    event_count: int
    timeline: list[dict[str, Any]]
    validators: list[ValidatorResult]
    duration_ms: float
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "correlation_id": self.correlation_id,
            "booking_id": self.booking_id,
            "decision_ids": self.decision_ids,
            "event_count": self.event_count,
            "timeline": self.timeline,
            "duration_ms": self.duration_ms,
            "errors": self.errors,
            "validators": [
                {
                    "name": v.name,
                    "passed": v.passed,
                    "errors": v.errors,
                    "warnings": v.warnings,
                    "metrics": v.metrics,
                }
                for v in self.validators
            ],
        }
