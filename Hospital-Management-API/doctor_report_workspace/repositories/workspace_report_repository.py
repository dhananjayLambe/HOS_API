"""WorkspaceReportRepository — ORM → evaluated domain rows only.

Data retrieval: find_reports, find_pending_uploads, count_reports,
count_pending_uploads. Never exposes QuerySets or workspace KPI labels.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from django.db.models import Exists, OuterRef, Prefetch, Q, QuerySet
from django.db.models.functions import Coalesce, Lower
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from diagnostics_engine.domain.reports.active_report import active_reports_queryset
from diagnostics_engine.models.choices import OrderTestLineStatus
from diagnostics_engine.models.orders import DiagnosticOrderTestLine
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport

from doctor_report_workspace.domain.report_detail_aggregate import ReportDetailAggregate
from doctor_report_workspace.domain.report_download_aggregate import ReportDownloadAggregate
from doctor_report_workspace.domain.report_preview_aggregate import ReportPreviewAggregate
from doctor_report_workspace.domain.rows import AwaitingRow, ReportRow
from doctor_report_workspace.filters.workspace_filter_builder import WorkspaceFilterBuilder
from doctor_report_workspace.repositories.criteria import (
    PageResult,
    WorkspaceListCriteria,
    WorkspaceScope,
)
from doctor_report_workspace.repositories.cursor import decode_cursor, encode_cursor
from doctor_report_workspace.search.criteria import WorkspaceSearchCriteria
from doctor_report_workspace.search.search_predicates import WorkspaceSearchPredicates

PENDING_UPLOAD_GRACE_MINUTES = 30
EXCLUDED_ENCOUNTER_STATUSES = ["cancelled", "no_show"]

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100

ALLOWED_REPORT_ORDERING = {
    "-uploaded_at": ("-sort_ts", "-id"),
    "uploaded_at": ("sort_ts", "id"),
    "-report_date": ("-sort_ts", "-id"),
    "report_date": ("sort_ts", "id"),
    "-patient_name": ("-patient_sort", "-id"),
    "patient_name": ("patient_sort", "id"),
}

ALLOWED_AWAITING_ORDERING = {
    "-uploaded_at": ("-updated_at", "-id"),
    "uploaded_at": ("updated_at", "id"),
    "-report_date": ("-updated_at", "-id"),
    "report_date": ("updated_at", "id"),
    "-patient_name": ("-patient_sort", "-id"),
    "patient_name": ("patient_sort", "id"),
}


def _doctor_clinic_report_scope(*, doctor_id, clinic_id) -> Q:
    doctor_scope = Q(order_test_line__order__encounter__doctor_id=doctor_id) | Q(
        order_test_line__order__doctor_id=doctor_id
    )
    return (
        doctor_scope
        & Q(order_test_line__order__encounter__clinic_id=clinic_id)
        & ~Q(order_test_line__order__encounter__status__in=EXCLUDED_ENCOUNTER_STATUSES)
    )


def _doctor_clinic_line_scope(*, doctor_id, clinic_id) -> Q:
    doctor_scope = Q(order__encounter__doctor_id=doctor_id) | Q(order__doctor_id=doctor_id)
    return (
        doctor_scope
        & Q(order__encounter__clinic_id=clinic_id)
        & ~Q(order__encounter__status__in=EXCLUDED_ENCOUNTER_STATUSES)
    )


def _has_uploaded_artifact_exists() -> Exists:
    return Exists(
        DiagnosticReportArtifact.objects.filter(
            report_id=OuterRef("pk"),
            is_active=True,
        ).filter(Q(file__gt="") | Q(storage_path__gt=""))
    )


def _has_active_report_for_line_exists() -> Exists:
    superseding = DiagnosticTestReport.objects.filter(
        supersedes_id=OuterRef("pk"),
        deleted_at__isnull=True,
    )
    return Exists(
        DiagnosticTestReport.objects.filter(
            order_test_line_id=OuterRef("pk"),
            deleted_at__isnull=True,
        )
        .annotate(_is_superseded=Exists(superseding))
        .filter(_is_superseded=False)
    )


def _clamp_page_size(page_size: int | None) -> int:
    if page_size is None:
        return DEFAULT_PAGE_SIZE
    try:
        size = int(page_size)
    except (TypeError, ValueError):
        return DEFAULT_PAGE_SIZE
    if size < 1:
        return DEFAULT_PAGE_SIZE
    return min(size, MAX_PAGE_SIZE)


class WorkspaceReportRepository:
    """Owned workspace query surface — returns evaluated domain rows / aggregates only."""

    DETAIL_SELECT_RELATED = (
        "order_test_line__order__patient_profile__account__user",
        "order_test_line__order__branch",
        "order_test_line__order__doctor",
        "order_test_line__order__consultation",
        "order_test_line__order__encounter",
        "order_test_line__service__category",
    )
    ACCESS_SELECT_RELATED = ("order_test_line__order",)
    LIST_SELECT_RELATED = DETAIL_SELECT_RELATED
    AWAITING_SELECT_RELATED = (
        "order__patient_profile__account__user",
        "order__branch",
        "order__doctor",
        "order__consultation",
        "order__encounter",
        "service__category",
    )

    def _active_artifact_prefetch(self) -> Prefetch:
        return Prefetch(
            "artifacts",
            queryset=DiagnosticReportArtifact.objects.filter(is_active=True).order_by(
                "uploaded_at", "id"
            ),
            to_attr="prefetched_active_artifacts",
        )

    def _scoped_report_with_active_artifacts(
        self,
        scope: WorkspaceScope,
        report_id: Any,
        *,
        select_related: tuple[str, ...],
        annotate_has_artifact: bool = False,
    ) -> DiagnosticTestReport | None:
        """Shared loader for detail / preview / download. No selection/URLs/audit."""
        qs = (
            active_reports_queryset()
            .filter(
                _doctor_clinic_report_scope(
                    doctor_id=scope.doctor_id, clinic_id=scope.clinic_id
                )
            )
            .filter(pk=report_id)
        )
        if annotate_has_artifact:
            qs = qs.annotate(_has_artifact=_has_uploaded_artifact_exists())
        if select_related:
            qs = qs.select_related(*select_related)
        qs = qs.prefetch_related(self._active_artifact_prefetch())
        return qs.first()

    def get_report_detail(
        self,
        scope: WorkspaceScope,
        report_id: Any,
    ) -> ReportDetailAggregate | None:
        """Load one active report head as a fully hydrated aggregate, or None.

        Never raises for not-found / out-of-scope (privacy-equivalent).
        """
        report = self._scoped_report_with_active_artifacts(
            scope,
            report_id,
            select_related=self.DETAIL_SELECT_RELATED,
            annotate_has_artifact=True,
        )
        if report is None:
            return None

        line = getattr(report, "order_test_line", None)
        order = getattr(line, "order", None) if line is not None else None
        artifacts = tuple(getattr(report, "prefetched_active_artifacts", []) or [])
        has_artifact = bool(getattr(report, "_has_artifact", False)) or bool(artifacts)

        return ReportDetailAggregate(
            report=report,
            patient=getattr(order, "patient_profile", None) if order is not None else None,
            encounter=getattr(order, "encounter", None) if order is not None else None,
            consultation=getattr(order, "consultation", None) if order is not None else None,
            branch=getattr(order, "branch", None) if order is not None else None,
            doctor=getattr(order, "doctor", None) if order is not None else None,
            service=getattr(line, "service", None) if line is not None else None,
            artifacts=artifacts,
            has_artifact=has_artifact,
            ordered_at=getattr(order, "created_at", None) if order is not None else None,
            collected_at=getattr(order, "collected_at", None) if order is not None else None,
            uploaded_at=getattr(report, "uploaded_at", None),
        )

    def get_download_artifact(
        self,
        scope: WorkspaceScope,
        report_id: Any,
    ) -> ReportDownloadAggregate | None:
        """Load scoped active report + active artifacts for download. No primary/URL/audit."""
        report = self._scoped_report_with_active_artifacts(
            scope,
            report_id,
            select_related=self.ACCESS_SELECT_RELATED,
        )
        if report is None:
            return None
        artifacts = tuple(getattr(report, "prefetched_active_artifacts", []) or [])
        return ReportDownloadAggregate(report=report, artifacts=artifacts)

    def get_preview_artifact(
        self,
        scope: WorkspaceScope,
        report_id: Any,
    ) -> ReportPreviewAggregate | None:
        """Load scoped active report + active artifacts for preview. No selection/URL/audit."""
        report = self._scoped_report_with_active_artifacts(
            scope,
            report_id,
            select_related=self.ACCESS_SELECT_RELATED,
        )
        if report is None:
            return None
        artifacts = tuple(getattr(report, "prefetched_active_artifacts", []) or [])
        return ReportPreviewAggregate(report=report, artifacts=artifacts)

    def find_reports(
        self,
        scope: WorkspaceScope,
        criteria: WorkspaceListCriteria,
        *,
        page_size: int | None = None,
        cursor: str | None = None,
    ) -> PageResult:
        limit = _clamp_page_size(page_size)
        qs = self._reports_queryset(scope, criteria)
        qs = self._apply_report_ordering(qs, criteria.ordering)
        qs = self._apply_report_cursor(qs, criteria.ordering, cursor)
        batch = list(qs[: limit + 1])
        has_more = len(batch) > limit
        page = batch[:limit]
        next_cursor = None
        if has_more and page:
            last = page[-1]
            next_cursor = encode_cursor(
                ordering_value=self._report_cursor_value(last, criteria.ordering),
                pk=last.id,
            )
        rows = tuple(
            ReportRow(report=r, has_artifact=bool(getattr(r, "_has_artifact", False)))
            for r in page
        )
        return PageResult(rows=rows, next_cursor=next_cursor, page_size=limit)

    def search_reports(
        self,
        scope: WorkspaceScope,
        criteria: WorkspaceSearchCriteria,
    ) -> PageResult:
        """Search active report heads with WorkspaceSearchPredicates; return ReportRows."""
        list_criteria = WorkspaceListCriteria(
            q=criteria.q,
            patient_id=criteria.patient_id,
            consultation_id=criteria.consultation_id,
            encounter_id=criteria.encounter_id,
            doctor_id=criteria.doctor_id,
            lab_id=criteria.lab_id,
            category=criteria.category,
            status=criteria.status,
            date_from=criteria.date_from,
            date_to=criteria.date_to,
            ordering=criteria.ordering or "-uploaded_at",
        )
        return self.find_reports(
            scope,
            list_criteria,
            page_size=criteria.page_size,
            cursor=criteria.cursor,
        )

    def find_pending_uploads(
        self,
        scope: WorkspaceScope,
        criteria: WorkspaceListCriteria,
        *,
        page_size: int | None = None,
        cursor: str | None = None,
    ) -> PageResult:
        limit = _clamp_page_size(page_size)
        qs = self._pending_uploads_queryset(scope, criteria)
        qs = self._apply_awaiting_ordering(qs, criteria.ordering)
        qs = self._apply_awaiting_cursor(qs, criteria.ordering, cursor)
        batch = list(qs[: limit + 1])
        has_more = len(batch) > limit
        page = batch[:limit]
        next_cursor = None
        if has_more and page:
            last = page[-1]
            next_cursor = encode_cursor(
                ordering_value=self._awaiting_cursor_value(last, criteria.ordering),
                pk=last.id,
            )
        rows = tuple(AwaitingRow(line=line) for line in page)
        return PageResult(rows=rows, next_cursor=next_cursor, page_size=limit)

    def count_reports(self, scope: WorkspaceScope, criteria: WorkspaceListCriteria) -> int:
        return self._reports_queryset(scope, criteria, hydrate=False).count()

    def count_pending_uploads(
        self, scope: WorkspaceScope, criteria: WorkspaceListCriteria
    ) -> int:
        return self._pending_uploads_queryset(scope, criteria, hydrate=False).count()

    # --- queryset builders (private; never returned) ---

    def _reports_queryset(
        self,
        scope: WorkspaceScope,
        criteria: WorkspaceListCriteria,
        *,
        hydrate: bool = True,
    ) -> QuerySet:
        qs = (
            active_reports_queryset()
            .filter(_doctor_clinic_report_scope(doctor_id=scope.doctor_id, clinic_id=scope.clinic_id))
            .annotate(_has_artifact=_has_uploaded_artifact_exists())
        )
        if hydrate:
            qs = qs.select_related(*self.LIST_SELECT_RELATED)
        qs = qs.distinct()
        qs = self._apply_report_filters(qs, criteria, doctor_id=scope.doctor_id)
        return qs

    def _pending_uploads_queryset(
        self,
        scope: WorkspaceScope,
        criteria: WorkspaceListCriteria,
        *,
        hydrate: bool = True,
    ) -> QuerySet:
        grace_cutoff = timezone.now() - timedelta(minutes=PENDING_UPLOAD_GRACE_MINUTES)
        qs = (
            DiagnosticOrderTestLine.objects.filter(
                status=OrderTestLineStatus.COMPLETED,
                updated_at__lte=grace_cutoff,
            )
            .filter(
                _doctor_clinic_line_scope(doctor_id=scope.doctor_id, clinic_id=scope.clinic_id)
            )
            .annotate(_has_active_report=_has_active_report_for_line_exists())
            .filter(_has_active_report=False)
        )
        if hydrate:
            qs = qs.select_related(*self.AWAITING_SELECT_RELATED)
        qs = qs.distinct()
        qs = self._apply_line_filters(qs, criteria, doctor_id=scope.doctor_id)
        return qs

    def _apply_report_filters(
        self, qs: QuerySet, criteria: WorkspaceListCriteria, *, doctor_id
    ) -> QuerySet:
        qs = qs.filter(
            WorkspaceFilterBuilder.build_for_reports(criteria, doctor_id=doctor_id)
        )
        if criteria.q:
            qs = self._apply_report_search(qs, criteria.q)
        return qs

    def _apply_line_filters(
        self, qs: QuerySet, criteria: WorkspaceListCriteria, *, doctor_id
    ) -> QuerySet:
        qs = qs.filter(
            WorkspaceFilterBuilder.build_for_lines(criteria, doctor_id=doctor_id)
        )
        if criteria.q:
            qs = self._apply_line_search(qs, criteria.q)
        return qs

    def _apply_report_search(self, qs: QuerySet, term: str) -> QuerySet:
        return qs.filter(WorkspaceSearchPredicates.build(term))

    def _apply_line_search(self, qs: QuerySet, term: str) -> QuerySet:
        return qs.filter(WorkspaceSearchPredicates.build_for_order_line(term))

    def _apply_report_ordering(self, qs: QuerySet, ordering: str) -> QuerySet:
        order_keys = ALLOWED_REPORT_ORDERING.get(ordering, ALLOWED_REPORT_ORDERING["-uploaded_at"])
        # sort_ts: coalesce uploaded_at / ready_at / created_at
        qs = qs.annotate(
            sort_ts=Coalesce("uploaded_at", "ready_at", "created_at"),
            patient_sort=Lower(
                "order_test_line__order__patient_profile__first_name"
            ),
        )
        return qs.order_by(*order_keys)

    def _apply_awaiting_ordering(self, qs: QuerySet, ordering: str) -> QuerySet:
        order_keys = ALLOWED_AWAITING_ORDERING.get(
            ordering, ALLOWED_AWAITING_ORDERING["-uploaded_at"]
        )
        qs = qs.annotate(
            patient_sort=Lower("order__patient_profile__first_name"),
        )
        return qs.order_by(*order_keys)

    def _apply_report_cursor(
        self, qs: QuerySet, ordering: str, cursor: str | None
    ) -> QuerySet:
        decoded = decode_cursor(cursor)
        if not decoded:
            return qs
        ordering_value, pk = decoded
        ts = self._parse_ts(ordering_value)
        descending = ordering.startswith("-")
        if "patient_name" in ordering:
            # (patient_sort, id) keyset
            name = str(ordering_value or "")
            if descending:
                return qs.filter(
                    Q(patient_sort__lt=name) | Q(patient_sort=name, id__lt=pk)
                )
            return qs.filter(Q(patient_sort__gt=name) | Q(patient_sort=name, id__gt=pk))

        if ts is None:
            return qs
        if descending:
            return qs.filter(Q(sort_ts__lt=ts) | Q(sort_ts=ts, id__lt=pk))
        return qs.filter(Q(sort_ts__gt=ts) | Q(sort_ts=ts, id__gt=pk))

    def _apply_awaiting_cursor(
        self, qs: QuerySet, ordering: str, cursor: str | None
    ) -> QuerySet:
        decoded = decode_cursor(cursor)
        if not decoded:
            return qs
        ordering_value, pk = decoded
        descending = ordering.startswith("-")
        if "patient_name" in ordering:
            name = str(ordering_value or "")
            if descending:
                return qs.filter(
                    Q(patient_sort__lt=name) | Q(patient_sort=name, id__lt=pk)
                )
            return qs.filter(Q(patient_sort__gt=name) | Q(patient_sort=name, id__gt=pk))

        ts = self._parse_ts(ordering_value)
        if ts is None:
            return qs
        if descending:
            return qs.filter(Q(updated_at__lt=ts) | Q(updated_at=ts, id__lt=pk))
        return qs.filter(Q(updated_at__gt=ts) | Q(updated_at=ts, id__gt=pk))

    @staticmethod
    def _parse_ts(value: Any):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            parsed = parse_datetime(value)
            if parsed is not None:
                if timezone.is_naive(parsed):
                    return timezone.make_aware(parsed, timezone.get_current_timezone())
                return parsed
        return None

    @staticmethod
    def _report_cursor_value(report, ordering: str):
        if "patient_name" in ordering:
            return getattr(report, "patient_sort", "") or ""
        return getattr(report, "sort_ts", None) or report.created_at

    @staticmethod
    def _awaiting_cursor_value(line, ordering: str):
        if "patient_name" in ordering:
            return getattr(line, "patient_sort", "") or ""
        return line.updated_at
