"""Timeline event grouping utilities."""

from __future__ import annotations

from collections import defaultdict

from support_trace.timeline.types import TimelineEvent, WorkflowSnapshot


class TimelineGrouping:
    @classmethod
    def group_by_workflow(
        cls, events: list[TimelineEvent]
    ) -> dict[str, list[TimelineEvent]]:
        groups: dict[str, list[TimelineEvent]] = defaultdict(list)
        for event in events:
            wf_id = event.workflow_instance_id
            if wf_id:
                groups[wf_id].append(event)
        return dict(groups)

    @classmethod
    def group_by_category(
        cls, events: list[TimelineEvent]
    ) -> dict[str, list[TimelineEvent]]:
        groups: dict[str, list[TimelineEvent]] = defaultdict(list)
        for event in events:
            groups[event.category].append(event)
        return dict(groups)

    @classmethod
    def group_by_tag(
        cls, events: list[TimelineEvent]
    ) -> dict[str, list[TimelineEvent]]:
        groups: dict[str, list[TimelineEvent]] = defaultdict(list)
        for event in events:
            for tag in event.tags:
                groups[tag].append(event)
        return dict(groups)

    @classmethod
    def group_snapshots_by_workflow(
        cls, snapshots: list[WorkflowSnapshot]
    ) -> dict[str, WorkflowSnapshot]:
        return {s.workflow_instance_id: s for s in snapshots}
