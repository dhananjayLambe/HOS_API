"""Incident reconstruction pipeline orchestrator."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Callable

from support_trace.incident.failure_analysis import FailureAnalysisEngine
from support_trace.incident.impact_analysis import ImpactAnalysisEngine
from support_trace.incident.investigation_context import IncidentContext, ReconstructionPolicy
from support_trace.incident.narrative_builder import NarrativeBuilder
from support_trace.incident.recommendation_builder import RecommendationBuilder
from support_trace.incident.relationship_engine import RelationshipEngine
from support_trace.incident.retry_analysis import RetryAnalysisEngine
from support_trace.incident.summary_builder import IncidentSummaryBuilder
from support_trace.incident.types import (
    DurationAnalysis,
    EntityRefs,
    FailureAnalysis,
    ImpactAnalysis,
    IncidentReport,
    IncidentSummary,
    RetryAnalysis,
    WorkflowGraph,
)
from support_trace.incident.workflow_duration import WorkflowDurationEngine
from support_trace.incident.workflow_graph_builder import WorkflowGraphBuilder
from support_trace.incident.certification import IncidentCertification
from support_trace.incident.hooks import fail_open_reconstruction
from support_trace.lookup import TraceLookupService
from support_trace.lookup.types import TraceLookupResult

ANALYSIS_ENGINES = (
    FailureAnalysisEngine,
    RetryAnalysisEngine,
    WorkflowDurationEngine,
    ImpactAnalysisEngine,
)


class ReconstructionEngine:
    @classmethod
    def reconstruct(
        cls,
        ctx: IncidentContext,
        lookup_fn: Callable[..., TraceLookupResult],
        *args: Any,
        **kwargs: Any,
    ) -> IncidentReport:
        return fail_open_reconstruction(
            "reconstruct",
            lambda: cls._reconstruct_impl(ctx, lookup_fn, *args, **kwargs),
            default=cls._empty_report(ctx),
        )

    @classmethod
    def _reconstruct_impl(
        cls,
        ctx: IncidentContext,
        lookup_fn: Callable[..., TraceLookupResult],
        *args: Any,
        **kwargs: Any,
    ) -> IncidentReport:
        started = time.perf_counter()
        opts = ctx.options
        inv_level = ReconstructionPolicy.to_investigation_level(ctx.level)
        inv_policy = ctx.policy.to_investigation_policy()
        inv_options = ReconstructionPolicy.investigation_options_for(ctx.level)

        lookup = lookup_fn(
            *args,
            level=inv_level,
            options=inv_options,
            policy=inv_policy,
            **kwargs,
        )

        failure: FailureAnalysis | None = None
        retry: RetryAnalysis | None = None
        duration: DurationAnalysis | None = None
        impact: ImpactAnalysis | None = None

        if opts.include_failure:
            failure = FailureAnalysisEngine.analyze(ctx, lookup)
        if opts.include_retry:
            retry = RetryAnalysisEngine.analyze(ctx, lookup)
        if opts.include_duration:
            duration = WorkflowDurationEngine.analyze(ctx, lookup)
        if opts.include_impact:
            impact = ImpactAnalysisEngine.analyze(ctx, lookup)

        graph: WorkflowGraph = (
            WorkflowGraphBuilder.build(lookup)
            if opts.include_graph
            else WorkflowGraph(nodes=(), edges=())
        )
        entities = WorkflowGraphBuilder.extract_entities(lookup)

        summary: IncidentSummary | None = None
        if opts.include_summary:
            summary = IncidentSummaryBuilder.build(
                lookup, failure=failure, retry=retry, duration=duration, impact=impact
            )

        narrative: str | None = None
        if opts.include_narrative:
            narrative = NarrativeBuilder.build(
                lookup, summary=summary, failure=failure, retry=retry, duration=duration
            )

        recommendations = ()
        if opts.include_recommendations:
            recommendations = RecommendationBuilder.build(lookup, failure=failure, retry=retry)

        related_wf = RelationshipEngine.related_workflow_ids(lookup)
        related_resources = tuple(
            sorted(
                set(
                    list(entities.patient and [entities.patient] or [])
                    + list(entities.booking and [entities.booking] or [])
                    + list(entities.consultation and [entities.consultation] or [])
                )
            )
        )

        primary_wf = (
            str(getattr(lookup.primary_trace, "workflow_instance_id", ""))
            if lookup.primary_trace
            else None
        )

        duration_ms = (time.perf_counter() - started) * 1000
        partial = lookup.primary_trace is None or (
            lookup.identifier_lookup is not None
            and lookup.identifier_lookup.traces
            and lookup.timeline is None
            and opts.include_failure
        )

        report = IncidentReport(
            investigation_id=ctx.investigation_id,
            primary_workflow=primary_wf,
            entities=entities,
            timeline=lookup.timeline,
            workflow_graph=graph,
            related_workflows=related_wf,
            related_resources=related_resources,
            failure=failure,
            retry=retry,
            duration=duration,
            impact=impact,
            summary=summary,
            narrative=narrative,
            recommendations=recommendations,
            statistics=lookup.statistics,
            generated_at=datetime.now(timezone.utc),
            duration_ms=duration_ms,
            scope=lookup.scope or ctx.scope,
            level=str(ctx.level),
            partial=partial,
        )

        IncidentCertification.validate(report)
        return report

    @classmethod
    def _empty_report(cls, ctx: IncidentContext) -> IncidentReport:
        return IncidentReport(
            investigation_id=ctx.investigation_id,
            primary_workflow=None,
            entities=EntityRefs(),
            timeline=None,
            workflow_graph=WorkflowGraph(nodes=(), edges=()),
            related_workflows=(),
            related_resources=(),
            failure=None,
            retry=None,
            duration=None,
            impact=None,
            summary=None,
            narrative=None,
            recommendations=(),
            statistics=None,
            generated_at=datetime.now(timezone.utc),
            duration_ms=0.0,
            scope=ctx.scope,
            level=str(ctx.level),
            partial=True,
        )
