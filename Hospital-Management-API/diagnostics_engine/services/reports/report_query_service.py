"""
Read-only query orchestration for diagnostic report workflows.

Task queue (``get_report_task_queue``): active workflow reports by generation/delivery state.
Ready delivery queue (``get_reports_ready_for_delivery``): READY + non-empty primary file only.

Upload, workflow transitions, and channel delivery live in sibling services.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time
from typing import Any

from django.db.models import Exists, OuterRef, Prefetch, Q, QuerySet
from django.utils import timezone

from diagnostics_engine.domain.reports import (
    active_reports_queryset,
    get_active_report_for_line as domain_get_active_report_for_line,
    get_primary_artifact as domain_get_primary_artifact,
)
from diagnostics_engine.services.reports.access_control import (
    filter_reports_queryset_for_branch,
    report_belongs_to_branch as access_report_belongs_to_branch,
)
from labs.api.services.patient_search import patient_profile_name_search_q
from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.orders import DiagnosticOrder, DiagnosticOrderTestLine
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from labs.choices.tracking import DeliveryStatus
from labs.models.lab_tracking import LabReportDeliveryLog
from labs.models.lab_workflow import LabOrderAssignment

logger = logging.getLogger(__name__)

_STATUS_TOKEN_MAP: dict[str, Q] = {
    "pending": Q(status=ReportLifecycleStatus.PENDING),
    "pending_upload": Q(status=ReportLifecycleStatus.PENDING),
    "in_progress": Q(status=ReportLifecycleStatus.IN_PROGRESS),
    "uploaded": Q(status=ReportLifecycleStatus.IN_PROGRESS),
    "ready": Q(status=ReportLifecycleStatus.READY),
    "ready_delivery": Q(status=ReportLifecycleStatus.READY),
    "delivered": Q(status=ReportLifecycleStatus.DELIVERED),
    "rejected": Q(status=ReportLifecycleStatus.REJECTED),
    "delivery_failed": Q(delivery_status=DeliveryStatus.FAILED),
}


class ReportQueryService:
    """Optimized retrieval for dashboards, queues, history, and download lookup."""

    # ------------------------------------------------------------------ canonical API

    @classmethod
    def get_active_report_for_line(
        cls,
        *,
        order_test_line: DiagnosticOrderTestLine,
    ) -> DiagnosticTestReport | None:
        report = domain_get_active_report_for_line(order_test_line)
        if report is None:
            return None
        return cls._prefetch_report_relations(
            DiagnosticTestReport.objects.filter(pk=report.pk),
        ).first()

    @classmethod
    def get_reports_for_patient(
        cls,
        *,
        patient_profile,
        include_deleted: bool = False,
    ) -> QuerySet[DiagnosticTestReport]:
        """
        Patient report history (active heads only).

        ``include_deleted`` exposes soft-deleted active-head reports only.
        Superseded historical revisions remain excluded.
        This is NOT full audit/history mode.
        Future audit APIs may introduce ``include_superseded=True``.
        """
        qs = cls._base_active_report_queryset(include_deleted=include_deleted).filter(
            order_test_line__order__patient_profile=patient_profile,
        )
        qs = cls._prefetch_report_relations(qs)
        return qs.order_by("-updated_at")

    @classmethod
    def get_reports_for_encounter(cls, *, encounter) -> QuerySet[DiagnosticTestReport]:
        qs = cls._base_active_report_queryset().filter(
            order_test_line__order__encounter=encounter,
        )
        qs = cls._prefetch_report_relations(qs)
        return qs.order_by("updated_at")

    @classmethod
    def get_operational_report_history(cls, *, report_id) -> DiagnosticTestReport:
        """
        Active-lineage operational history context for one report head.

        Not audit retrieval — excludes superseded branches and inactive revisions.
        """
        from diagnostics_engine.services.reports.report_validation_service import (
            ReportValidationService,
        )

        report = cls.get_report(report_id)
        ReportValidationService.validate_report_active(report)
        ReportValidationService.validate_report_not_superseded(report)
        return report

    @classmethod
    def apply_patient_report_filters(
        cls,
        qs: QuerySet[DiagnosticTestReport],
        *,
        status: str | None = None,
        encounter_id=None,
        date_from: date | datetime | None = None,
        date_to: date | datetime | None = None,
    ) -> QuerySet[DiagnosticTestReport]:
        if status:
            token = status.strip()
            key = token.lower()
            if key in _STATUS_TOKEN_MAP:
                qs = qs.filter(_STATUS_TOKEN_MAP[key])
            elif token in ReportLifecycleStatus.values:
                qs = qs.filter(status=token)
            elif token.upper() in ReportLifecycleStatus.values:
                qs = qs.filter(status=token.upper())

        if encounter_id is not None:
            qs = qs.filter(order_test_line__order__encounter_id=encounter_id)

        if date_from is not None:
            qs = qs.filter(updated_at__gte=cls._start_of_day(date_from))
        if date_to is not None:
            qs = qs.filter(updated_at__lte=cls._end_of_day(date_to))
        return qs

    @classmethod
    def get_patient_reports_for_branch(
        cls,
        *,
        patient_profile,
        branch_id,
        status: str | None = None,
        encounter_id=None,
        date_from: date | datetime | None = None,
        date_to: date | datetime | None = None,
    ) -> QuerySet[DiagnosticTestReport]:
        qs = cls.get_reports_for_patient(patient_profile=patient_profile)
        qs = filter_reports_queryset_for_branch(qs, branch_id)
        return cls.apply_patient_report_filters(
            qs,
            status=status,
            encounter_id=encounter_id,
            date_from=date_from,
            date_to=date_to,
        )

    @classmethod
    def get_encounter_reports_for_branch(
        cls,
        *,
        encounter,
        branch_id,
    ) -> QuerySet[DiagnosticTestReport]:
        qs = cls.get_reports_for_encounter(encounter=encounter)
        return filter_reports_queryset_for_branch(qs, branch_id)

    @classmethod
    def get_report_task_queue(
        cls,
        *,
        branch=None,
        statuses: list[str] | None = None,
        collection_type: str | None = None,
        search: str | None = None,
        date_from: date | datetime | None = None,
        date_to: date | datetime | None = None,
    ) -> QuerySet[DiagnosticTestReport]:
        """
        Operational task queue: active workflow reports (one task per test line head).

        Status token ``ready`` / ``ready_delivery`` reflects generation READY only,
        not deliverability. Use ``get_reports_ready_for_delivery`` for send queues.
        """
        qs = cls._base_active_report_queryset()
        qs = cls._apply_queue_filters(
            qs,
            branch=branch,
            statuses=statuses,
            collection_type=collection_type,
            date_from=date_from,
            date_to=date_to,
        )
        if search:
            qs = cls._apply_search_filters(qs, search)
        qs = cls._prefetch_report_relations(qs)
        return qs.order_by("-updated_at", "-created_at")

    @classmethod
    def get_reports_ready_for_delivery(
        cls,
        *,
        branch=None,
    ) -> QuerySet[DiagnosticTestReport]:
        """
        Deliverable queue: READY generation status plus active primary artifact with stored file.

        Stricter than task-queue READY filter; prevents broken WhatsApp / download handoffs.
        """
        qs = cls._base_active_report_queryset().filter(status=ReportLifecycleStatus.READY)
        qs = cls._annotate_has_primary_artifact(qs).filter(_has_primary_artifact=True)
        if branch is not None:
            branch_id = getattr(branch, "id", branch)
            qs = qs.filter(order_test_line__order__branch_id=branch_id)
        qs = cls._prefetch_report_relations(qs)
        return qs.order_by("-updated_at", "-created_at")

    @classmethod
    def get_report_by_download_token(cls, *, token: str) -> DiagnosticTestReport | None:
        """
        Phase 1: resolve via delivery log metadata token.

        Phase 2: replace with expiring signed ``DiagnosticReportShareToken`` model.
        """
        if not token:
            return None
        log = (
            LabReportDeliveryLog.objects.filter(
                is_deleted=False,
                metadata__delivery_token=token,
            )
            .select_related("diagnostic_test_report")
            .order_by("-created_at")
            .first()
        )
        if log is None:
            return None
        report = log.diagnostic_test_report
        # Delivery log must reference the active report head (superseded reports rejected).
        if not active_reports_queryset().filter(pk=report.pk).exists():
            logger.warning(
                "Download token resolved to superseded report report_id=%s",
                report.id,
            )
            return None
        return cls._prefetch_report_relations(
            DiagnosticTestReport.objects.filter(pk=report.pk),
        ).first()

    @classmethod
    def get_primary_artifact(cls, *, report: DiagnosticTestReport):
        prefetched = cls._prefetched_artifacts(report)
        if prefetched is not None:
            for artifact in prefetched:
                if artifact.is_primary and artifact.is_active:
                    return artifact
            return None
        return domain_get_primary_artifact(report)

    @classmethod
    def get_active_artifacts(cls, *, report: DiagnosticTestReport):
        prefetched = cls._prefetched_artifacts(report)
        if prefetched is not None:
            return [a for a in prefetched if a.is_active]
        return list(
            report.artifacts.filter(is_active=True).order_by("-uploaded_at"),
        )

    # ------------------------------------------------------------------ backward compatibility

    @classmethod
    def get_report(cls, report_id) -> DiagnosticTestReport:
        return cls._prefetch_report_relations(
            DiagnosticTestReport.objects.filter(pk=report_id),
        ).get()

    @classmethod
    def get_lab_assignment_for_branch(
        cls,
        *,
        assignment_id,
        branch_id,
    ) -> LabOrderAssignment:
        """Load assignment + order graph for task context (prefetch only here)."""
        return (
            LabOrderAssignment.objects.filter(
                pk=assignment_id,
                lab_branch_id=branch_id,
                is_deleted=False,
            )
            .select_related(
                "diagnostic_order",
                "diagnostic_order__patient_profile",
                "diagnostic_order__patient_profile__account",
                "diagnostic_order__patient_profile__account__user",
                "diagnostic_order__consultation",
                "diagnostic_order__consultation__encounter",
            )
            .prefetch_related(
                Prefetch(
                    "diagnostic_order__test_lines",
                    queryset=DiagnosticOrderTestLine.objects.select_related("service").prefetch_related(
                        "test_reports",
                    ),
                ),
                "diagnostic_order__collection_request",
                "diagnostic_order__visit_appointment",
            )
            .get()
        )

    @classmethod
    def report_belongs_to_branch(cls, *, report: DiagnosticTestReport, branch_id) -> bool:
        return access_report_belongs_to_branch(report=report, branch_id=branch_id)

    @classmethod
    def active_report_for_line(cls, line_id) -> DiagnosticTestReport | None:
        line = DiagnosticOrderTestLine.objects.select_related("order", "service").get(pk=line_id)
        return cls.get_active_report_for_line(order_test_line=line)

    @classmethod
    def reports_for_order(cls, order: DiagnosticOrder) -> list[DiagnosticTestReport]:
        # TODO: replace per-line active lookup with bulk active-head annotation query for large orders.
        lines = order.test_lines.all()
        return [
            r
            for line in lines
            if (r := cls.get_active_report_for_line(order_test_line=line)) is not None
        ]

    @classmethod
    def reports_ready_queue(cls, *, status: str | None = None) -> QuerySet:
        if status == ReportLifecycleStatus.READY:
            return cls.get_reports_ready_for_delivery()
        qs = cls.get_report_task_queue(statuses=[status] if status else None)
        return qs

    @classmethod
    def patient_history(cls, *, patient_profile_id) -> QuerySet:
        from patient_account.models import PatientProfile

        profile = PatientProfile.objects.get(pk=patient_profile_id)
        return cls.get_reports_for_patient(patient_profile=profile)

    @classmethod
    def primary_artifact_for_report(cls, report_id):
        report = cls.get_report(report_id)
        return cls.get_primary_artifact(report=report)

    # ------------------------------------------------------------------ private helpers

    @staticmethod
    def _base_active_report_queryset(*, include_deleted: bool = False) -> QuerySet:
        return active_reports_queryset(include_deleted=include_deleted)

    @classmethod
    def _prefetch_report_relations(cls, qs: QuerySet) -> QuerySet:
        return qs.select_related(
            "order_test_line",
            "order_test_line__order",
            "order_test_line__order__patient_profile",
            "order_test_line__order__patient_profile__account",
            "order_test_line__order__patient_profile__account__user",
            "order_test_line__order__encounter",
            "order_test_line__service",
        ).prefetch_related(
            Prefetch(
                "artifacts",
                queryset=DiagnosticReportArtifact.objects.filter(is_active=True).order_by(
                    "-is_primary",
                    "-uploaded_at",
                ),
            ),
            Prefetch(
                "delivery_logs",
                queryset=LabReportDeliveryLog.objects.filter(is_deleted=False).order_by(
                    "-created_at",
                ),
            ),
        )

    @classmethod
    def _annotate_has_primary_artifact(cls, qs: QuerySet) -> QuerySet:
        primary_exists = DiagnosticReportArtifact.objects.filter(
            report_id=OuterRef("pk"),
            is_primary=True,
            is_active=True,
            file__isnull=False,
        ).exclude(file="")
        return qs.annotate(_has_primary_artifact=Exists(primary_exists))

    @classmethod
    def _apply_queue_filters(
        cls,
        qs: QuerySet,
        *,
        branch: Any = None,
        statuses: list[str] | None = None,
        collection_type: str | None = None,
        date_from: date | datetime | None = None,
        date_to: date | datetime | None = None,
    ) -> QuerySet:
        if branch is not None:
            branch_id = getattr(branch, "id", branch)
            qs = qs.filter(order_test_line__order__branch_id=branch_id)

        if statuses:
            status_q = Q()
            for raw in statuses:
                token = (raw or "").strip()
                key = token.lower()
                if key in _STATUS_TOKEN_MAP:
                    status_q |= _STATUS_TOKEN_MAP[key]
                elif key in ReportLifecycleStatus.values:
                    status_q |= Q(status=key)
                elif token in DeliveryStatus.values:
                    status_q |= Q(delivery_status=token)
                elif token.upper() in DeliveryStatus.values:
                    status_q |= Q(delivery_status=token.upper())
            if status_q:
                qs = qs.filter(status_q)

        ct = (collection_type or "").strip().upper()
        if ct == "HOME":
            qs = qs.filter(order_test_line__order__sample_collection_mode="home")
        elif ct in ("VISIT", "BRANCH"):
            qs = qs.filter(order_test_line__order__sample_collection_mode="lab")

        if date_from is not None:
            qs = qs.filter(created_at__gte=cls._start_of_day(date_from))
        if date_to is not None:
            qs = qs.filter(created_at__lte=cls._end_of_day(date_to))
        return qs

    @staticmethod
    def _apply_search_filters(qs: QuerySet, search: str) -> QuerySet:
        # Phase 1: icontains across related fields.
        # Future: indexed search backend (e.g. Elasticsearch) if queue polling volume grows.
        term = (search or "").strip()
        if not term:
            return qs
        return qs.filter(
            Q(order_test_line__order__order_number__icontains=term)
            | Q(order_test_line__service__name__icontains=term)
            | patient_profile_name_search_q(term, "order_test_line__order__patient_profile")
        )

    @staticmethod
    def _prefetched_artifacts(report: DiagnosticTestReport) -> tuple | None:
        cache = getattr(report, "_prefetched_objects_cache", None)
        if cache and "artifacts" in cache:
            return tuple(cache["artifacts"])
        return None

    @staticmethod
    def _start_of_day(value: date | datetime) -> datetime:
        if isinstance(value, datetime):
            if timezone.is_aware(value):
                return value
            return timezone.make_aware(value)
        return timezone.make_aware(datetime.combine(value, time.min))

    @staticmethod
    def _end_of_day(value: date | datetime) -> datetime:
        if isinstance(value, datetime):
            if timezone.is_aware(value):
                return value
            return timezone.make_aware(value)
        return timezone.make_aware(datetime.combine(value, time.max))
