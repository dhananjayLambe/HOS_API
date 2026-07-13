"""Investigation pipeline orchestrator."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from support_trace.identifiers.types import IdentifierLookupResult
from support_trace.lookup.audit_lookup import AuditLookupDelegate
from support_trace.lookup.certification import InvestigationCertification
from support_trace.lookup.enums import InvestigationLevel
from support_trace.lookup.error_classification import ErrorClassificationBuilder
from support_trace.lookup.health_builder import HealthBuilder
from support_trace.lookup.hooks import fail_open_investigation
from support_trace.lookup.investigation_policy import InvestigationOptions, InvestigationPolicy
from support_trace.lookup.relationship_lookup import RelationshipLookupDelegate
from support_trace.lookup.statistics_builder import StatisticsBuilder
from support_trace.lookup.summary_builder import SummaryBuilder
from support_trace.lookup.timeline_lookup import TimelineLookupDelegate
from support_trace.lookup.types import (
    IdentifierCollection,
    InvestigationContext,
    InvestigationTimeline,
    TraceLookupResult,
)
from support_trace.timeline.timeline_snapshot import TimelineSnapshotBuilder
from support_trace.timeline.types import TimelineScope, WorkflowSnapshot


class InvestigationEngine:
    @classmethod
    def investigate(cls, context: InvestigationContext) -> TraceLookupResult:
        return fail_open_investigation(
            "investigate",
            lambda: cls._investigate_impl(context),
            default=TraceLookupResult(
                level=context.level,
                scope=cls._scope_label(context),
            ),
        )

    @classmethod
    def _investigate_impl(cls, context: InvestigationContext) -> TraceLookupResult:
        started = time.perf_counter()
        context.generated_at = context.generated_at or datetime.now(timezone.utc)

        if context.options is None:
            context.options = context.policy.apply_level(context.level)

        lookup = context.lookup_result
        scope = context.timeline_scope
        if lookup is None or scope is None:
            return TraceLookupResult(
                level=context.level,
                generated_at=context.generated_at,
                duration_ms=(time.perf_counter() - started) * 1000,
                scope=cls._scope_label(context),
            )

        primary_trace = context.primary_trace or (lookup.traces[0] if lookup.traces else None)
        context.primary_trace = primary_trace

        bundle = context.bundle
        if bundle is None and scope:
            bundle = TimelineLookupDelegate.fetch_bundle(scope, context.policy)
            context.bundle = bundle

        timeline_result = None
        investigation_timeline = None
        if context.options.include_timeline and bundle and scope:
            timeline_result = TimelineLookupDelegate.build_timeline(
                bundle, scope, filters=context.filters, policy=context.policy
            )
            context.timeline_result = timeline_result
            investigation_timeline = InvestigationTimeline(result=timeline_result)

        clinical_audits: tuple = ()
        business_audits: tuple = ()
        if context.options.include_audits and bundle:
            clinical_audits, business_audits = AuditLookupDelegate.extract(bundle)

        related_traces: list = []
        if context.options.include_relationships and lookup.traces:
            related_traces = RelationshipLookupDelegate.expand(
                lookup.traces, policy=context.policy
            )
            context.related_traces = related_traces

        all_traces = list(lookup.traces) + list(lookup.related_traces) + related_traces
        seen_wf: set[str] = set()
        unique_traces = []
        for t in all_traces:
            wf = str(getattr(t, "workflow_instance_id", ""))
            if wf and wf not in seen_wf:
                seen_wf.add(wf)
                unique_traces.append(t)

        identifiers = (
            IdentifierCollection.merge_traces(unique_traces)
            if unique_traces
            else IdentifierCollection.empty()
        )

        primary_snapshot: WorkflowSnapshot | None = None
        if context.options.include_snapshots and primary_trace:
            snapshots = TimelineSnapshotBuilder.from_traces([primary_trace])
            primary_snapshot = snapshots[0] if snapshots else None

        health = None
        if context.options.include_health:
            health = HealthBuilder.evaluate(
                primary_trace,
                investigation_timeline,
                all_traces=unique_traces,
            )

        summary = None
        if context.options.include_summary:
            summary = SummaryBuilder.build(primary_trace, investigation_timeline, health)

        statistics = None
        if context.options.include_statistics:
            statistics = StatisticsBuilder.compute(
                investigation_timeline,
                related_traces=related_traces,
                clinical_count=len(clinical_audits),
                business_count=len(business_audits),
            )

        error_class = ErrorClassificationBuilder.classify(primary_trace, investigation_timeline)

        workflow_graph = investigation_timeline.workflow_tree if investigation_timeline else None

        result = TraceLookupResult(
            identifier_lookup=lookup,
            primary_trace=primary_trace,
            primary_snapshot=primary_snapshot,
            timeline=investigation_timeline,
            clinical_audits=clinical_audits,
            business_audits=business_audits,
            workflow_graph=workflow_graph,
            identifiers=identifiers,
            health=health,
            summary=summary,
            statistics=statistics,
            error_classification=error_class,
            level=context.level,
            generated_at=context.generated_at,
            duration_ms=(time.perf_counter() - started) * 1000,
            scope=cls._scope_label(context, scope=scope),
        )
        InvestigationCertification.validate(result, policy=context.policy)
        return result

    @staticmethod
    def _scope_label(
        context: InvestigationContext,
        scope: TimelineScope | None = None,
    ) -> str:
        if scope:
            return f"{scope.scope_type}:{scope.scope_value}"
        if context.timeline_scope:
            s = context.timeline_scope
            return f"{s.scope_type}:{s.scope_value}"
        if context.lookup_result:
            return f"identifier:{context.lookup_result.normalized}"
        return "unknown:"

    @classmethod
    def build_context_from_lookup(
        cls,
        lookup: IdentifierLookupResult,
        *,
        level: InvestigationLevel = InvestigationLevel.FULL,
        options: InvestigationOptions | None = None,
        policy: InvestigationPolicy | None = None,
        filters=None,
    ) -> InvestigationContext:
        from support_trace.lookup.timeline_lookup import TimelineLookupDelegate

        scope = TimelineLookupDelegate.resolve_scope(lookup)
        primary = lookup.traces[0] if lookup.traces else None
        return InvestigationContext(
            lookup_result=lookup,
            timeline_scope=scope,
            primary_trace=primary,
            filters=filters,
            options=options,
            level=level,
            policy=policy or InvestigationPolicy.default(),
        )
