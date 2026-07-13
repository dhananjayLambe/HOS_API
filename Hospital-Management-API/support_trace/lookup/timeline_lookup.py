"""Timeline scope resolution and build from bundle."""

from __future__ import annotations

from support_trace.identifiers.types import IdentifierLookupResult
from support_trace.lookup.investigation_policy import InvestigationPolicy
from support_trace.timeline.timeline_engine import TimelineEngine
from support_trace.timeline.timeline_repository import TimelineRepository
from support_trace.timeline.timeline_resolver import TimelineResolver
from support_trace.timeline.types import TimelineFetchBundle, TimelineFilter, TimelineResult, TimelineScope


class TimelineLookupDelegate:
    @staticmethod
    def resolve_scope(lookup: IdentifierLookupResult) -> TimelineScope:
        return TimelineResolver.from_lookup_result(lookup)

    @staticmethod
    def fetch_bundle(scope: TimelineScope, policy: InvestigationPolicy) -> TimelineFetchBundle:
        bundle = TimelineRepository.fetch_bundle(scope)
        clinical = list(bundle.clinical_rows)
        business = list(bundle.business_rows)
        traces = list(bundle.support_traces)
        if policy.max_audit_rows and len(clinical) + len(business) > policy.max_audit_rows:
            ratio = policy.max_audit_rows / max(len(clinical) + len(business), 1)
            clinical = clinical[: int(len(clinical) * ratio) + 1]
            business = business[: int(len(business) * ratio) + 1]
        if policy.allowed_workflow_types:
            allowed = policy.allowed_workflow_types
            traces = [t for t in traces if str(getattr(t, "workflow_type", "")) in allowed]
        if policy.max_relationship_expansion:
            traces = traces[: policy.max_relationship_expansion]
        return TimelineFetchBundle(
            clinical_rows=tuple(clinical),
            business_rows=tuple(business),
            support_traces=tuple(traces),
            scope=bundle.scope,
        )

    @staticmethod
    def build_timeline(
        bundle: TimelineFetchBundle,
        scope: TimelineScope,
        *,
        filters: TimelineFilter | None = None,
        policy: InvestigationPolicy | None = None,
    ) -> TimelineResult:
        result = TimelineEngine.build_from_bundle(bundle, scope, filters=filters)
        if policy and policy.max_timeline_events and len(result.events) > policy.max_timeline_events:
            result.events = result.events[: policy.max_timeline_events]
        return result
