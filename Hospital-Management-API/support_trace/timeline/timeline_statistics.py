"""Timeline statistics computation."""

from __future__ import annotations

from support_trace.timeline.constants import ACTIVE_WORKFLOW_STATUSES, TERMINAL_WORKFLOW_STATUSES
from support_trace.timeline.enums import TimelineCategory, TimelineSeverity, TimelineSource
from support_trace.timeline.timeline_grouping import TimelineGrouping
from support_trace.timeline.types import TimelineEvent, TimelineStatistics, WorkflowSnapshot


class TimelineStatisticsBuilder:
    @classmethod
    def compute(
        cls,
        events: list[TimelineEvent],
        snapshots: list[WorkflowSnapshot],
    ) -> TimelineStatistics:
        if not events:
            return TimelineStatistics(
                retry_count_total=sum(s.retry_count for s in snapshots),
            )

        workflow_groups = TimelineGrouping.group_by_workflow(events)
        snapshot_map = TimelineGrouping.group_snapshots_by_workflow(snapshots)

        first_at = min(e.timestamp for e in events)
        last_at = max(e.timestamp for e in events)
        duration_ms = int((last_at - first_at).total_seconds() * 1000)

        failed_events = sum(
            1
            for e in events
            if e.severity in (TimelineSeverity.ERROR, TimelineSeverity.CRITICAL)
            or (e.status and "fail" in str(e.status).lower())
        )
        retry_events = sum(1 for e in events if "retry" in e.tags)
        critical_events = sum(1 for e in events if e.severity == TimelineSeverity.CRITICAL)
        communication_count = sum(
            1 for e in events if e.category == TimelineCategory.COMMUNICATION
        )

        workflow_ids = set(workflow_groups.keys()) | set(snapshot_map.keys())
        completed = sum(
            1
            for s in snapshots
            if s.status in TERMINAL_WORKFLOW_STATUSES and s.status == "Completed"
        )
        active = sum(1 for s in snapshots if s.status in ACTIVE_WORKFLOW_STATUSES)

        return TimelineStatistics(
            clinical_events=sum(1 for e in events if e.source == TimelineSource.CLINICAL_AUDIT),
            business_events=sum(1 for e in events if e.source == TimelineSource.BUSINESS_AUDIT),
            total_events=len(events),
            workflow_count=len(workflow_ids),
            communication_count=communication_count,
            failed_events=failed_events,
            retry_events=retry_events,
            critical_events=critical_events,
            completed_workflows=completed,
            active_workflows=active,
            first_event_at=first_at,
            last_event_at=last_at,
            timeline_duration_ms=duration_ms,
            retry_count_total=sum(s.retry_count for s in snapshots),
        )
