"""Certification result types for communication audit."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ValidatorResult:
    name: str
    passed: bool
    errors: list[str] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)


@dataclass
class CertificationReport:
    passed: bool
    communication_id: str | None
    correlation_id: str | None
    attempt_ids: list[str]
    event_count: int
    timeline: list[dict]
    validators: list[ValidatorResult]
    duration_ms: float
    errors: list[str] = field(default_factory=list)
