"""Incident context and reconstruction policy."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from support_trace.incident.enums import ReconstructionLevel
from support_trace.lookup.enums import InvestigationLevel
from support_trace.lookup.investigation_policy import InvestigationOptions, InvestigationPolicy


@dataclass(frozen=True)
class ReconstructionOptions:
    include_failure: bool = False
    include_retry: bool = False
    include_duration: bool = False
    include_impact: bool = False
    include_graph: bool = False
    include_summary: bool = False
    include_narrative: bool = False
    include_recommendations: bool = False


@dataclass(frozen=True)
class ReconstructionPolicy:
    max_graph_depth: int = 5
    max_relationship_expansion: int = 50
    mask_patient_pii: bool = False
    role: str = "support"

    @classmethod
    def default(cls) -> ReconstructionPolicy:
        return cls()

    @classmethod
    def for_support(cls) -> ReconstructionPolicy:
        return cls(mask_patient_pii=True, role="support")

    @classmethod
    def for_admin(cls) -> ReconstructionPolicy:
        return cls(max_graph_depth=10, max_relationship_expansion=100, role="admin")

    def to_investigation_policy(self) -> InvestigationPolicy:
        return InvestigationPolicy(
            max_graph_depth=self.max_graph_depth,
            max_relationship_expansion=self.max_relationship_expansion,
            mask_patient_pii=self.mask_patient_pii,
            role=self.role,
        )

    def apply_level(self, level: ReconstructionLevel) -> ReconstructionOptions:
        if level == ReconstructionLevel.BASIC:
            return ReconstructionOptions()
        if level == ReconstructionLevel.STANDARD:
            return ReconstructionOptions(include_summary=True)
        if level == ReconstructionLevel.DEEP:
            return ReconstructionOptions(
                include_failure=True,
                include_retry=True,
                include_duration=True,
                include_impact=True,
                include_graph=True,
                include_summary=True,
                include_narrative=True,
                include_recommendations=True,
            )
        return ReconstructionOptions(
            include_failure=True,
            include_retry=True,
            include_duration=True,
            include_impact=True,
            include_graph=True,
            include_summary=True,
        )

    @staticmethod
    def to_investigation_level(level: ReconstructionLevel) -> InvestigationLevel:
        mapping = {
            ReconstructionLevel.BASIC: InvestigationLevel.BASIC,
            ReconstructionLevel.STANDARD: InvestigationLevel.STANDARD,
            ReconstructionLevel.FULL: InvestigationLevel.FULL,
            ReconstructionLevel.DEEP: InvestigationLevel.DEEP,
        }
        return mapping.get(level, InvestigationLevel.FULL)

    @staticmethod
    def investigation_options_for(level: ReconstructionLevel) -> InvestigationOptions:
        inv_level = ReconstructionPolicy.to_investigation_level(level)
        return InvestigationPolicy.default().apply_level(inv_level)


@dataclass(frozen=True)
class IncidentContext:
    investigation_id: str
    scope: str
    level: ReconstructionLevel
    policy: ReconstructionPolicy
    started_at: datetime
    role: str = "support"
    mask_pii: bool = False

    @classmethod
    def create(
        cls,
        scope: str,
        *,
        level: ReconstructionLevel = ReconstructionLevel.FULL,
        policy: ReconstructionPolicy | None = None,
        investigation_id: str | None = None,
    ) -> IncidentContext:
        pol = policy or ReconstructionPolicy.default()
        return cls(
            investigation_id=investigation_id or str(uuid.uuid4()),
            scope=scope,
            level=level,
            policy=pol,
            started_at=datetime.now(timezone.utc),
            role=pol.role,
            mask_pii=pol.mask_patient_pii,
        )

    @property
    def options(self) -> ReconstructionOptions:
        return self.policy.apply_level(self.level)
