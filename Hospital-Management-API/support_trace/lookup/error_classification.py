"""Error classification for future RCA."""

from __future__ import annotations

from typing import Any

from support_trace.lookup.enums import ErrorClassification
from support_trace.lookup.types import InvestigationTimeline
from support_trace.timeline.enums import TimelineSeverity


class ErrorClassificationBuilder:
    @classmethod
    def classify(
        cls,
        primary_trace: Any | None,
        timeline: InvestigationTimeline | None,
    ) -> str:
        if timeline:
            for event in reversed(timeline.events):
                if event.severity not in (TimelineSeverity.ERROR, TimelineSeverity.CRITICAL):
                    continue
                tags = event.tags or ()
                action = str(event.action or "")
                if "provider" in tags or "provider" in action:
                    return ErrorClassification.PROVIDER
                if "routing" in tags or "routing" in action:
                    return ErrorClassification.INFRASTRUCTURE
                if "whatsapp" in tags or "communication" in str(event.category).lower():
                    return ErrorClassification.PROVIDER
                if event.category and "Clinical" in str(event.category):
                    return ErrorClassification.BUSINESS
                return ErrorClassification.TECHNICAL
        if primary_trace:
            status = str(getattr(primary_trace, "status", "") or "")
            if status.lower() == "failed":
                wf = str(getattr(primary_trace, "workflow_type", "") or "")
                if wf in ("Routing", "ReportDelivery"):
                    return ErrorClassification.INFRASTRUCTURE
                if getattr(primary_trace, "provider_reference", None):
                    return ErrorClassification.PROVIDER
                return ErrorClassification.TECHNICAL
        return ErrorClassification.UNKNOWN
