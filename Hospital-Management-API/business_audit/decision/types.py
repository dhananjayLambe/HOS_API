"""Typed structures for Decision Snapshot payloads."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class RuleResult:
    rule: str
    outcome: str
    priority: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CandidateLab:
    lab_id: str
    branch_id: str
    rank: int
    score: float
    confidence: float
    price: float | None = None
    discount: float | None = None
    sla_minutes: int | None = None
    distance_km: float | None = None
    labels: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class RejectedLab:
    lab_id: str
    branch_id: str
    reason: str
    reason_label: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class WhyNotSelected:
    lab_id: str
    rank: int
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Explanation:
    summary: str
    rule: str
    decision_path: list[str] = field(default_factory=list)
    why_not_selected: list[WhyNotSelected] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["why_not_selected"] = [w.to_dict() for w in self.why_not_selected]
        return data


@dataclass
class ProviderResponse:
    marketplace: str
    returned_count: int
    filtered_count: int
    selected_count: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DecisionTimings:
    evaluation_time_ms: int = 0
    comparison_time_ms: int = 0
    discount_time_ms: int = 0
    routing_time_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DecisionSnapshot:
    decision_id: str
    routing_id: str
    booking_id: str | None
    attempt_number: int
    strategy: str
    rule_id: str
    rule_version: str
    selected_lab_id: str | None = None
    selected_branch_id: str | None = None
    selected_score: float | None = None
    selected_rank: int | None = None
    confidence: float | None = None
    weights: dict[str, int] = field(default_factory=dict)
    candidate_labs: list[CandidateLab] = field(default_factory=list)
    rule_results: list[RuleResult] = field(default_factory=list)
    rejected_labs: list[RejectedLab] = field(default_factory=list)
    explanation: Explanation | None = None
    provider_response: ProviderResponse | None = None
    decision_reason: str = ""
    timings_ms: DecisionTimings = field(default_factory=DecisionTimings)

    def to_dict(self) -> dict[str, Any]:
        return {
            "decision_id": self.decision_id,
            "routing_id": self.routing_id,
            "booking_id": self.booking_id,
            "attempt_number": self.attempt_number,
            "strategy": self.strategy,
            "rule_id": self.rule_id,
            "rule_version": self.rule_version,
            "selected_lab_id": self.selected_lab_id,
            "selected_branch_id": self.selected_branch_id,
            "selected_score": self.selected_score,
            "selected_rank": self.selected_rank,
            "confidence": self.confidence,
            "weights": self.weights,
            "candidate_labs": [c.to_dict() for c in self.candidate_labs],
            "rule_results": [r.to_dict() for r in self.rule_results],
            "rejected_labs": [r.to_dict() for r in self.rejected_labs],
            "explanation": self.explanation.to_dict() if self.explanation else None,
            "provider_response": self.provider_response.to_dict() if self.provider_response else None,
            "decision_reason": self.decision_reason,
            "timings_ms": self.timings_ms.to_dict(),
        }
