"""M5.9-ready timeline certification validators."""

from __future__ import annotations

import logging

from support_trace.timeline.constants import CERTIFICATION_REQUIRED_ACTIONS
from support_trace.timeline.event_registry import EventRegistry
from support_trace.timeline.types import TimelineEvent, TimelineGraph, TimelineResult

logger = logging.getLogger(__name__)


class TimelineCertification:
    @classmethod
    def validate(cls, result: TimelineResult) -> list[str]:
        warnings: list[str] = []
        warnings.extend(cls.validate_no_duplicate_events(result.events))
        warnings.extend(cls.validate_timestamps_present(result.events))
        warnings.extend(cls.validate_monotonic_sequence(result.events))
        warnings.extend(cls.validate_parent_workflow_exists(result.events, result.workflow_tree))
        warnings.extend(cls.validate_no_orphan_business_events(result.events))
        warnings.extend(cls.validate_correlation_consistency(result.events))
        warnings.extend(cls.validate_sequence_consistency(result.events))
        warnings.extend(cls.validate_event_registry_coverage(result.events))
        for warning in warnings:
            logger.warning("timeline_certification_warning", extra={"warning": warning})
        return warnings

    @classmethod
    def validate_no_duplicate_events(cls, events: list[TimelineEvent]) -> list[str]:
        seen: set[tuple[str, str]] = set()
        warnings: list[str] = []
        for event in events:
            key = (event.reference_type, event.reference_id)
            if key in seen:
                warnings.append(f"duplicate event: {key}")
            seen.add(key)
        return warnings

    @classmethod
    def validate_timestamps_present(cls, events: list[TimelineEvent]) -> list[str]:
        return [
            f"missing timestamp on {e.reference_id}"
            for e in events
            if e.timestamp is None
        ]

    @classmethod
    def validate_monotonic_sequence(cls, events: list[TimelineEvent]) -> list[str]:
        if not events:
            return []
        sequences = [e.timeline_sequence for e in events]
        expected = list(range(1, len(events) + 1))
        if sequences != expected:
            return ["timeline_sequence is not monotonic 1..N"]
        return []

    @classmethod
    def validate_parent_workflow_exists(
        cls,
        events: list[TimelineEvent],
        graph: TimelineGraph,
    ) -> list[str]:
        node_ids = {n.workflow_instance_id for n in graph.nodes}
        warnings: list[str] = []
        for event in events:
            parent = event.parent_workflow_instance_id
            if parent and parent not in node_ids and event.workflow_instance_id:
                warnings.append(
                    f"parent workflow {parent} not in graph for event {event.reference_id}"
                )
        return warnings

    @classmethod
    def validate_no_orphan_business_events(cls, events: list[TimelineEvent]) -> list[str]:
        warnings: list[str] = []
        for event in events:
            if event.reference_type == "business_audit" and not (
                event.correlation_id or event.workflow_instance_id
            ):
                warnings.append(f"orphan business event: {event.reference_id}")
        return warnings

    @classmethod
    def validate_correlation_consistency(cls, events: list[TimelineEvent]) -> list[str]:
        corr_ids = {e.correlation_id for e in events if e.correlation_id}
        if len(corr_ids) > 1:
            return [f"multiple correlation IDs in timeline: {corr_ids}"]
        return []

    @classmethod
    def validate_sequence_consistency(cls, events: list[TimelineEvent]) -> list[str]:
        warnings: list[str] = []
        by_workflow: dict[str, list[int]] = {}
        for event in events:
            if event.workflow_instance_id and event.sequence_no is not None:
                by_workflow.setdefault(event.workflow_instance_id, []).append(
                    event.sequence_no
                )
        for wf_id, seqs in by_workflow.items():
            if seqs != sorted(seqs):
                warnings.append(f"non-monotonic sequence_no for workflow {wf_id}")
        return warnings

    @classmethod
    def validate_event_registry_coverage(cls, events: list[TimelineEvent]) -> list[str]:
        warnings: list[str] = []
        for action in CERTIFICATION_REQUIRED_ACTIONS:
            if EventRegistry.get(action) is None:
                warnings.append(f"certification action missing from registry: {action}")
        return warnings
