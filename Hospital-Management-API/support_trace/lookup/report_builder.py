"""Investigation report export — JSON, Markdown, Plain Text."""

from __future__ import annotations

import json
from typing import Any

from support_trace.lookup.types import TraceLookupResult


class InvestigationReportBuilder:
    @classmethod
    def to_json(cls, result: TraceLookupResult) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "scope": result.scope,
            "level": str(result.level),
            "duration_ms": result.duration_ms,
            "error_classification": result.error_classification,
        }
        if result.summary:
            payload["summary"] = {
                "structured": {
                    "workflow_type": result.summary.structured.workflow_type,
                    "current_status": result.summary.structured.current_status,
                    "current_step": result.summary.structured.current_step,
                    "next_expected_step": result.summary.structured.next_expected_step,
                    "duration_display": result.summary.structured.duration_display,
                    "retry_count": result.summary.structured.retry_count,
                    "failure_count": result.summary.structured.failure_count,
                },
                "narrative": result.summary.narrative.text,
            }
        if result.health:
            payload["health"] = {
                "overall": result.health.overall,
                "workflow": result.health.workflow,
                "communication": result.health.communication,
                "infrastructure": result.health.infrastructure,
                "provider": result.health.provider,
            }
        if result.statistics:
            payload["statistics"] = {
                "timeline_events": result.statistics.timeline_events,
                "failed_events": result.statistics.failed_events,
                "retries": result.statistics.retries,
            }
        if result.identifiers:
            payload["identifiers"] = dict(result.identifiers.by_field)
        if result.timeline:
            payload["recent_events"] = [
                {"sequence": e.timeline_sequence, "event": e.event, "severity": e.severity}
                for e in result.timeline.events[-10:]
            ]
        return payload

    @classmethod
    def to_markdown(cls, result: TraceLookupResult) -> str:
        lines = ["# Investigation Report", ""]
        lines.append(f"**Scope:** {result.scope}")
        lines.append(f"**Duration:** {result.duration_ms:.1f} ms")
        if result.summary:
            s = result.summary.structured
            lines.extend(
                [
                    "",
                    "## Summary",
                    f"- **Workflow:** {s.workflow_type}",
                    f"- **Status:** {s.current_status}",
                    f"- **Step:** {s.current_step or '—'}",
                    f"- **Next:** {s.next_expected_step or '—'}",
                    f"- **Duration:** {s.duration_display}",
                    "",
                    result.summary.narrative.text,
                ]
            )
        if result.health:
            lines.extend(
                [
                    "",
                    "## Health",
                    f"- Overall: {result.health.overall}",
                    f"- Workflow: {result.health.workflow}",
                    f"- Communication: {result.health.communication}",
                ]
            )
        return "\n".join(lines)

    @classmethod
    def to_plain_text(cls, result: TraceLookupResult) -> str:
        if result.summary:
            return result.summary.narrative.text
        return f"Investigation for {result.scope} ({result.duration_ms:.0f} ms)"

    @classmethod
    def generate(cls, result: TraceLookupResult, *, format: str = "markdown") -> str | dict:
        if format == "json":
            return cls.to_json(result)
        if format == "plain":
            return cls.to_plain_text(result)
        return cls.to_markdown(result)
