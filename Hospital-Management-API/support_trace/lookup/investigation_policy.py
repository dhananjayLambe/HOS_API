"""Investigation policy — depth, limits, masking, permissions."""

from __future__ import annotations

from dataclasses import dataclass

from support_trace.lookup.enums import InvestigationLevel


@dataclass(frozen=True)
class InvestigationOptions:
    include_timeline: bool = True
    include_relationships: bool = True
    include_audits: bool = True
    include_summary: bool = True
    include_health: bool = True
    include_statistics: bool = True
    include_snapshots: bool = True
    include_report: bool = False
    include_runtime: bool = False


@dataclass(frozen=True)
class InvestigationPolicy:
    max_graph_depth: int = 5
    max_relationship_expansion: int = 50
    max_timeline_events: int = 2000
    max_audit_rows: int = 5000
    allowed_workflow_types: frozenset[str] | None = None
    mask_patient_pii: bool = False
    role: str = "support"

    @classmethod
    def default(cls) -> InvestigationPolicy:
        return cls()

    @classmethod
    def for_patient_investigation(cls) -> InvestigationPolicy:
        return cls(
            max_graph_depth=4,
            max_relationship_expansion=30,
            mask_patient_pii=True,
            allowed_workflow_types=frozenset(
                {"Recommendation", "Booking", "Routing", "ReportDelivery", "Consultation"}
            ),
            role="support",
        )

    @classmethod
    def for_admin(cls) -> InvestigationPolicy:
        return cls(
            max_graph_depth=10,
            max_relationship_expansion=100,
            mask_patient_pii=False,
            allowed_workflow_types=None,
            role="admin",
        )

    def apply_level(self, level: InvestigationLevel) -> InvestigationOptions:
        if level == InvestigationLevel.BASIC:
            return InvestigationOptions(
                include_timeline=False,
                include_relationships=False,
                include_audits=False,
                include_summary=True,
                include_health=False,
                include_statistics=False,
                include_snapshots=True,
            )
        if level == InvestigationLevel.STANDARD:
            return InvestigationOptions(
                include_timeline=True,
                include_relationships=True,
                include_audits=False,
                include_summary=True,
                include_health=True,
                include_statistics=True,
                include_snapshots=True,
            )
        if level == InvestigationLevel.DEEP:
            return InvestigationOptions(
                include_timeline=True,
                include_relationships=True,
                include_audits=True,
                include_summary=True,
                include_health=True,
                include_statistics=True,
                include_snapshots=True,
                include_report=True,
            )
        return InvestigationOptions()
