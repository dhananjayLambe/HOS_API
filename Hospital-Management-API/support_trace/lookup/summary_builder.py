"""Structured and narrative investigation summaries."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from support_trace.lookup.constants import NEXT_STEP_HINTS
from support_trace.lookup.types import (
    HealthAssessment,
    InvestigationSummary,
    InvestigationTimeline,
    NarrativeSummary,
    StructuredSummary,
)
from support_trace.timeline.enums import TimelineSeverity


class SummaryBuilder:
    @classmethod
    def build(
        cls,
        primary_trace: Any | None,
        timeline: InvestigationTimeline | None,
        health: HealthAssessment | None,
    ) -> InvestigationSummary:
        structured = cls._structured(primary_trace, timeline)
        narrative = cls._narrative(primary_trace, timeline, health, structured)
        return InvestigationSummary(structured=structured, narrative=narrative)

    @classmethod
    def _structured(
        cls,
        trace: Any | None,
        timeline: InvestigationTimeline | None,
    ) -> StructuredSummary:
        if trace is None:
            return StructuredSummary(
                workflow_type="Unknown",
                current_status="Not Found",
                current_step=None,
                next_expected_step=None,
                started_at=None,
                completed_at=None,
                duration_display="—",
                retry_count=0,
                failure_count=0,
                patient_label=None,
                owner_label=None,
            )
        wf_type = str(getattr(trace, "workflow_type", "") or "Unknown")
        current_state = str(getattr(trace, "current_state", "") or getattr(trace, "status", "") or "")
        current_step = getattr(trace, "workflow_step", None)
        next_step = cls._next_expected_step(wf_type, current_state)
        started = getattr(trace, "started_at", None) or getattr(trace, "first_event_at", None)
        completed = getattr(trace, "completed_at", None)
        duration_ms = getattr(trace, "duration_ms", None)
        duration_display = cls._format_duration(duration_ms)
        retry_count = int(getattr(trace, "retry_count", 0) or 0)
        failure_count = timeline.statistics.failed_events if timeline else 0
        patient_label = getattr(trace, "patient_account_id", None)
        if patient_label and len(str(patient_label)) > 8:
            patient_label = f"Patient …{str(patient_label)[-8:]}"
        owner = getattr(trace, "laboratory_id", None) or getattr(trace, "branch_id", None)
        owner_label = f"Laboratory {owner}" if owner else None
        return StructuredSummary(
            workflow_type=wf_type,
            current_status=str(getattr(trace, "status", "") or ""),
            current_step=current_step,
            next_expected_step=next_step,
            started_at=started,
            completed_at=completed,
            duration_display=duration_display,
            retry_count=retry_count,
            failure_count=failure_count,
            patient_label=str(patient_label) if patient_label else None,
            owner_label=owner_label,
        )

    @staticmethod
    def _next_expected_step(workflow_type: str, current_state: str) -> str | None:
        hints = NEXT_STEP_HINTS.get(workflow_type, {})
        return hints.get(current_state)

    @staticmethod
    def _format_duration(duration_ms: int | None) -> str:
        if not duration_ms:
            return "—"
        minutes = duration_ms // 60000
        if minutes < 60:
            return f"{minutes} min"
        hours = minutes // 60
        return f"{hours}h {minutes % 60}m"

    @classmethod
    def _narrative(
        cls,
        trace: Any | None,
        timeline: InvestigationTimeline | None,
        health: HealthAssessment | None,
        structured: StructuredSummary,
    ) -> NarrativeSummary:
        if trace is None:
            return NarrativeSummary(text="No workflow found for the given identifier.")
        parts: list[str] = []
        wf_type = structured.workflow_type
        status = structured.current_status
        if status.lower() in ("completed", "success"):
            parts.append(f"{wf_type} completed successfully.")
        elif status.lower() in ("failed", "expired"):
            parts.append(f"{wf_type} failed and requires attention.")
        else:
            parts.append(f"{wf_type} is currently {status}.")
        if structured.next_expected_step:
            parts.append(f"Next expected step: {structured.next_expected_step}.")
        if timeline:
            stats = timeline.statistics
            if stats.failed_events == 0:
                parts.append("No failures recorded.")
            else:
                parts.append(f"{stats.failed_events} failure(s) detected.")
            if stats.retry_events == 0 and structured.retry_count == 0:
                parts.append("No retries occurred.")
            elif structured.retry_count > 0:
                parts.append(f"{structured.retry_count} retry attempt(s).")
            if structured.duration_display != "—":
                parts.append(f"Workflow duration {structured.duration_display}.")
            significant = [
                e.event
                for e in timeline.events[-5:]
                if e.severity in (TimelineSeverity.ERROR, TimelineSeverity.CRITICAL)
                or e.event
            ]
            if significant:
                parts.append(f"Recent events: {', '.join(significant[-3:])}.")
        if health and health.overall not in ("Healthy", "Completed"):
            parts.append(f"Overall health: {health.overall}.")
        return NarrativeSummary(text=" ".join(parts))
