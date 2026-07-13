"""Certification report DTO."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class SupportTraceCertificationReport:
    overall_score: float
    workflow_score: float
    timeline_score: float
    search_score: float
    runtime_score: float
    cloudwatch_score: float
    api_score: float
    performance_score: float
    certification_status: str
    warnings: tuple[str, ...]
    generated_at: datetime
    duration_ms: float

    @property
    def passed(self) -> bool:
        return self.certification_status == "PASS"
