"""Timeline aggregation pipeline orchestrator."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from support_trace.timeline.adapters import BusinessAdapter, ClinicalAdapter
from support_trace.timeline.certification import TimelineCertification
from support_trace.timeline.hooks import fail_open_timeline
from support_trace.timeline.timeline_filter import TimelineFilterEngine
from support_trace.timeline.timeline_graph import TimelineGraphBuilder
from support_trace.timeline.timeline_merger import TimelineMerger
from support_trace.timeline.timeline_repository import TimelineRepository
from support_trace.timeline.timeline_snapshot import TimelineSnapshotBuilder
from support_trace.timeline.timeline_statistics import TimelineStatisticsBuilder
from support_trace.timeline.types import TimelineFilter, TimelineFetchBundle, TimelineGraph, TimelineResult, TimelineScope


class TimelineEngine:
    _clinical_adapter = ClinicalAdapter()
    _business_adapter = BusinessAdapter()

    @classmethod
    def build(
        cls,
        scope: TimelineScope,
        *,
        filters: TimelineFilter | None = None,
    ) -> TimelineResult:
        return fail_open_timeline(
            "timeline_build",
            lambda: cls._build_impl(scope, filters=filters),
            default=TimelineResult(scope=f"{scope.scope_type}:{scope.scope_value}"),
        )

    @classmethod
    def build_from_bundle(
        cls,
        bundle: TimelineFetchBundle,
        scope: TimelineScope,
        *,
        filters: TimelineFilter | None = None,
    ) -> TimelineResult:
        return fail_open_timeline(
            "timeline_build_from_bundle",
            lambda: cls._build_impl(scope, filters=filters, bundle=bundle),
            default=TimelineResult(scope=f"{scope.scope_type}:{scope.scope_value}"),
        )

    @classmethod
    def _build_impl(
        cls,
        scope: TimelineScope,
        *,
        filters: TimelineFilter | None,
        bundle: TimelineFetchBundle | None = None,
    ) -> TimelineResult:
        started = time.perf_counter()
        if bundle is None:
            bundle = TimelineRepository.fetch_bundle(scope)

        clinical_events = cls._clinical_adapter.adapt_many(list(bundle.clinical_rows))
        business_events = cls._business_adapter.adapt_many(list(bundle.business_rows))
        events = TimelineMerger.merge(clinical_events, business_events)

        traces = list(bundle.support_traces)
        workflow_tree = TimelineGraphBuilder.build(traces, events)
        snapshots = TimelineSnapshotBuilder.from_traces(traces)

        statistics = TimelineStatisticsBuilder.compute(events, snapshots)

        if filters is not None:
            events = TimelineFilterEngine.apply(events, filters)

        result = TimelineResult(
            events=events,
            workflow_snapshots=snapshots,
            workflow_tree=workflow_tree,
            statistics=statistics,
            generated_at=datetime.now(timezone.utc),
            build_duration_ms=(time.perf_counter() - started) * 1000,
            scope=f"{scope.scope_type}:{scope.scope_value}",
        )
        TimelineCertification.validate(result)
        return result
