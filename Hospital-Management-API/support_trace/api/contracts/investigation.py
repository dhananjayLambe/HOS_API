"""Investigation request/response contracts."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from support_trace.lookup.enums import InvestigationLevel
from support_trace.lookup.investigation_policy import InvestigationOptions
from support_trace.timeline.types import TimelineFilter


@dataclass(frozen=True)
class InvestigationRequest:
    query: str | None = None
    level: InvestigationLevel = InvestigationLevel.FULL
    options: InvestigationOptions | None = None
    expand: frozenset[str] = frozenset()
    filters: TimelineFilter | None = None
    exact_only: bool = False
    limit: int = 20
    cursor: str | None = None
    stream: bool = False
    advanced_filters: dict[str, Any] | None = None
    include_related: bool = True


@dataclass(frozen=True)
class InvestigationResponse:
    identifier_lookup: dict[str, Any] | None = None
    primary_trace: dict[str, Any] | None = None
    primary_snapshot: dict[str, Any] | None = None
    timeline: dict[str, Any] | None = None
    clinical_audits: tuple[dict[str, Any], ...] = ()
    business_audits: tuple[dict[str, Any], ...] = ()
    workflow_graph: dict[str, Any] | None = None
    identifiers: dict[str, Any] = field(default_factory=dict)
    health: dict[str, Any] | None = None
    summary: dict[str, Any] | None = None
    statistics: dict[str, Any] | None = None
    error_classification: str = "Unknown"
    level: str = "Full"
    scope: str = ""
