"""Multi-dimension workflow health assessment."""

from __future__ import annotations

from typing import Any

from support_trace.enums import TraceStatus
from support_trace.lookup.constants import DEFAULT_SLA_MS, RETRY_ATTENTION_THRESHOLD, SLA_MS_BY_WORKFLOW
from support_trace.lookup.enums import InvestigationHealth
from support_trace.lookup.types import HealthAssessment, InvestigationTimeline
from support_trace.timeline.enums import TimelineSeverity


class HealthBuilder:
    @classmethod
    def evaluate(
        cls,
        primary_trace: Any | None,
        timeline: InvestigationTimeline | None,
        *,
        all_traces: list[Any] | None = None,
    ) -> HealthAssessment:
        workflow = cls._workflow_health(primary_trace, timeline)
        communication = cls._communication_health(timeline)
        infrastructure = cls._infrastructure_health(timeline)
        provider = cls._provider_health(primary_trace, timeline)
        aggregate = cls._aggregate_health(all_traces or [], timeline)
        overall = cls._worst(
            workflow, communication, infrastructure, provider, aggregate
        )
        return HealthAssessment(
            overall=overall,
            workflow=workflow,
            communication=communication,
            infrastructure=infrastructure,
            provider=provider,
            aggregate=aggregate,
        )

    @classmethod
    def _workflow_health(cls, trace: Any | None, timeline: InvestigationTimeline | None) -> str:
        if trace is None:
            return InvestigationHealth.WAITING
        status = str(getattr(trace, "status", "") or "")
        retry_count = int(getattr(trace, "retry_count", 0) or 0)
        stored = str(getattr(trace, "workflow_health", "") or "")
        if status in (TraceStatus.FAILED, TraceStatus.EXPIRED):
            return InvestigationHealth.ATTENTION_REQUIRED
        if retry_count > RETRY_ATTENTION_THRESHOLD:
            return InvestigationHealth.RETRYING
        if status == TraceStatus.COMPLETED:
            return InvestigationHealth.COMPLETED
        duration = getattr(trace, "duration_ms", None)
        wf_type = str(getattr(trace, "workflow_type", "") or "")
        sla = SLA_MS_BY_WORKFLOW.get(wf_type, DEFAULT_SLA_MS)
        if duration and duration > sla:
            return InvestigationHealth.DELAYED
        if stored in ("Warning", "Blocked"):
            return InvestigationHealth.DELAYED
        if status in (TraceStatus.RUNNING, TraceStatus.WAITING, TraceStatus.STARTED):
            if retry_count > 0:
                return InvestigationHealth.RETRYING
            return InvestigationHealth.WAITING
        if timeline and timeline.statistics.failed_events > 0:
            return InvestigationHealth.ATTENTION_REQUIRED
        return InvestigationHealth.HEALTHY

    @classmethod
    def _communication_health(cls, timeline: InvestigationTimeline | None) -> str:
        if timeline is None:
            return InvestigationHealth.HEALTHY
        comm_failures = sum(
            1
            for e in timeline.events
            if "whatsapp" in (e.tags or ()) or "communication" in str(e.category).lower()
            if e.severity in (TimelineSeverity.ERROR, TimelineSeverity.CRITICAL)
        )
        comm_retries = sum(
            1
            for e in timeline.events
            if "whatsapp" in (e.tags or ()) and "retry" in (e.tags or ())
        )
        if comm_failures > 0:
            return InvestigationHealth.ATTENTION_REQUIRED
        if comm_retries > 0:
            return InvestigationHealth.RETRYING
        return InvestigationHealth.HEALTHY

    @classmethod
    def _infrastructure_health(cls, timeline: InvestigationTimeline | None) -> str:
        if timeline is None:
            return InvestigationHealth.HEALTHY
        infra_failures = sum(
            1
            for e in timeline.events
            if e.severity == TimelineSeverity.CRITICAL
            and ("routing" in (e.tags or ()) or "system" in str(e.category).lower())
        )
        if infra_failures > 0:
            return InvestigationHealth.FAILED
        return InvestigationHealth.HEALTHY

    @classmethod
    def _provider_health(cls, trace: Any | None, timeline: InvestigationTimeline | None) -> str:
        if trace and getattr(trace, "provider_reference", None):
            stored = str(getattr(trace, "workflow_health", "") or "")
            if stored in ("Warning", "Blocked"):
                return InvestigationHealth.DELAYED
        if timeline:
            provider_events = [
                e for e in timeline.events if "provider" in (e.tags or ())
            ]
            if any(e.severity in (TimelineSeverity.ERROR, TimelineSeverity.CRITICAL) for e in provider_events):
                return InvestigationHealth.DELAYED
        return InvestigationHealth.HEALTHY

    @classmethod
    def _aggregate_health(cls, traces: list[Any], timeline: InvestigationTimeline | None) -> str:
        if not traces:
            return InvestigationHealth.HEALTHY
        statuses = [str(getattr(t, "status", "") or "") for t in traces]
        if any(s in (TraceStatus.FAILED, TraceStatus.EXPIRED) for s in statuses):
            return InvestigationHealth.ATTENTION_REQUIRED
        if any(int(getattr(t, "retry_count", 0) or 0) > RETRY_ATTENTION_THRESHOLD for t in traces):
            return InvestigationHealth.RETRYING
        if timeline and timeline.statistics.active_workflows > 0:
            return InvestigationHealth.WAITING
        if all(s == TraceStatus.COMPLETED for s in statuses if s):
            return InvestigationHealth.COMPLETED
        return InvestigationHealth.HEALTHY

    @staticmethod
    def _worst(*values: str) -> str:
        priority = {
            InvestigationHealth.FAILED: 6,
            InvestigationHealth.ATTENTION_REQUIRED: 5,
            InvestigationHealth.RETRYING: 4,
            InvestigationHealth.DELAYED: 3,
            InvestigationHealth.WAITING: 2,
            InvestigationHealth.COMPLETED: 1,
            InvestigationHealth.HEALTHY: 0,
        }
        return max(values, key=lambda v: priority.get(v, 0))
