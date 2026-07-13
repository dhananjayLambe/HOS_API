"""Read-only timeline data access."""

from __future__ import annotations

from datetime import datetime

from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.models import ClinicalAudit
from business_audit.booking.repository import BookingAuditRepository
from business_audit.domain.repository import BusinessAuditRepository
from business_audit.models import BusinessAudit
from business_audit.recommendation.repository import RecommendationAuditRepository
from support_trace.domain.repository import SupportTraceRepository
from support_trace.identifiers.relationship_resolver import RelationshipResolver
from support_trace.models import SupportTrace
from support_trace.timeline.types import TimelineFetchBundle, TimelineScope


class TimelineRepository:
    """Batch-read facade over immutable audits and SupportTrace."""

    _clinical_repo = ClinicalAuditRepository()
    _business_repo = BusinessAuditRepository()
    _booking_repo = BookingAuditRepository()
    _recommendation_repo = RecommendationAuditRepository()
    _trace_repo = SupportTraceRepository()

    @classmethod
    def fetch_bundle(cls, scope: TimelineScope) -> TimelineFetchBundle:
        clinical_rows: list[ClinicalAudit] = []
        business_rows: list[BusinessAudit] = []
        traces: list[SupportTrace] = []

        if scope.scope_type == "correlation":
            corr = scope.scope_value
            clinical_rows = cls._clinical_repo.get_by_correlation_id(corr)
            business_rows = cls._business_repo.get_by_correlation(corr)
            traces = cls._trace_repo.get_by_correlation(corr)
        elif scope.scope_type == "patient":
            clinical_rows = cls._clinical_repo.filter_by_patient(scope.scope_value)
            business_rows = cls._booking_repo.get_by_patient(scope.scope_value)
            traces = list(
                SupportTrace.objects.filter(
                    patient_account_id=scope.scope_value
                ).order_by("-updated_at")
            )
        elif scope.scope_type == "consultation":
            clinical_rows = cls._clinical_repo.filter_by_consultation(scope.scope_value)
            business_rows = cls._booking_repo.get_by_consultation(scope.scope_value)
            traces = list(
                SupportTrace.objects.filter(
                    consultation_id=scope.scope_value
                ).order_by("-updated_at")
            )
        elif scope.scope_type == "booking":
            business_rows = cls._booking_repo.get_by_booking(scope.scope_value)
            traces = list(
                SupportTrace.objects.filter(booking_id=scope.scope_value).order_by(
                    "-updated_at"
                )
            )
            if business_rows:
                corr = business_rows[0].correlation_id
                clinical_rows = cls._clinical_repo.get_by_correlation_id(corr)
        elif scope.scope_type == "workflow":
            business_rows = cls._business_repo.get_by_workflow_instance(scope.scope_value)
            trace = cls._trace_repo.get_by_workflow(scope.scope_value)
            traces = [trace] if trace else []
            if business_rows:
                corr = business_rows[0].correlation_id
                clinical_rows = cls._clinical_repo.get_by_correlation_id(corr)
        elif scope.scope_type == "recommendation":
            business_rows = cls._recommendation_repo.get_by_recommendation(scope.scope_value)
            traces = list(
                SupportTrace.objects.filter(
                    recommendation_id=scope.scope_value
                ).order_by("-updated_at")
            )

        if scope.correlation_ids:
            for corr in scope.correlation_ids:
                if corr not in {r.correlation_id for r in clinical_rows}:
                    clinical_rows.extend(cls._clinical_repo.get_by_correlation_id(corr))
                if corr not in {r.correlation_id for r in business_rows}:
                    business_rows.extend(cls._business_repo.get_by_correlation(corr))

        if scope.workflow_instance_ids:
            for wf_id in scope.workflow_instance_ids:
                trace = cls._trace_repo.get_by_workflow(wf_id)
                if trace and trace not in traces:
                    traces.append(trace)
                business_rows.extend(cls._business_repo.get_by_workflow_instance(wf_id))

        traces = cls._expand_traces(traces)

        if scope.date_from or scope.date_to:
            clinical_rows = cls._filter_clinical_dates(
                clinical_rows, scope.date_from, scope.date_to
            )
            business_rows = cls._filter_business_dates(
                business_rows, scope.date_from, scope.date_to
            )

        return TimelineFetchBundle(
            clinical_rows=tuple(clinical_rows),
            business_rows=tuple(business_rows),
            support_traces=tuple(traces),
            scope=scope,
        )

    @classmethod
    def _expand_traces(cls, traces: list[SupportTrace]) -> list[SupportTrace]:
        if not traces:
            return []
        expanded = RelationshipResolver.expand(traces)
        seen = {t.workflow_instance_id for t in traces}
        result = list(traces)
        for trace in expanded:
            if trace.workflow_instance_id not in seen:
                seen.add(trace.workflow_instance_id)
                result.append(trace)
        return result

    @classmethod
    def _filter_clinical_dates(
        cls,
        rows: list[ClinicalAudit],
        date_from: datetime | None,
        date_to: datetime | None,
    ) -> list[ClinicalAudit]:
        result = rows
        if date_from:
            result = [r for r in result if r.timestamp >= date_from]
        if date_to:
            result = [r for r in result if r.timestamp <= date_to]
        return result

    @classmethod
    def _filter_business_dates(
        cls,
        rows: list[BusinessAudit],
        date_from: datetime | None,
        date_to: datetime | None,
    ) -> list[BusinessAudit]:
        result = rows
        if date_from:
            result = [r for r in result if r.created_at >= date_from]
        if date_to:
            result = [r for r in result if r.created_at <= date_to]
        return result
