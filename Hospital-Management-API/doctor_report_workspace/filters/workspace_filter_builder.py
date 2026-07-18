"""Workspace filter language — SQL predicates only (no queryset execution)."""

from __future__ import annotations

from datetime import date, datetime, time
from typing import Any

from django.db.models import Q
from django.utils import timezone

from diagnostics_engine.models.choices import ReportLifecycleStatus

from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.repositories.criteria import WorkspaceListCriteria


def day_start(d: date) -> datetime:
    tz = timezone.get_current_timezone()
    return timezone.make_aware(datetime.combine(d, time.min), tz)


def day_end(d: date) -> datetime:
    tz = timezone.get_current_timezone()
    return timezone.make_aware(datetime.combine(d, time.max), tz)


def clinical_status_q_for_reports(*, status: str) -> Q:
    """SQL predicates mirroring ClinicalStatusMapper (requires `_has_artifact` annotation)."""
    updated = Q(revision_number__gt=1) | Q(supersedes_id__isnull=False)
    available = (
        Q(_has_artifact=True)
        | Q(status__in=(ReportLifecycleStatus.READY, ReportLifecycleStatus.DELIVERED))
    ) & ~updated
    awaiting = ~updated & ~available

    if status == ClinicalStatus.UPDATED:
        return updated
    if status == ClinicalStatus.AVAILABLE:
        return available
    if status == ClinicalStatus.AWAITING_REPORT:
        return awaiting
    return Q()


class WorkspaceFilterBuilder:
    """Composable filter predicates for report and awaiting-line querysets."""

    @classmethod
    def build_for_reports(
        cls,
        criteria: WorkspaceListCriteria,
        *,
        doctor_id: Any,
    ) -> Q:
        order = "order_test_line__order"
        q = Q()

        if criteria.patient_id:
            q &= Q(**{f"{order}__patient_profile_id": criteria.patient_id})
        if criteria.consultation_id:
            q &= Q(**{f"{order}__consultation_id": criteria.consultation_id})
        if criteria.encounter_id:
            q &= Q(**{f"{order}__encounter_id": criteria.encounter_id})
        if criteria.doctor_id:
            q &= Q(**{f"{order}__doctor_id": criteria.doctor_id})
        if criteria.lab_id:
            q &= Q(**{f"{order}__branch_id": criteria.lab_id})
        if criteria.category:
            q &= Q(order_test_line__service__category_id=criteria.category) | Q(
                order_test_line__service__category__code=criteria.category
            )

        if criteria.date_from:
            start = day_start(criteria.date_from)
            q &= Q(uploaded_at__gte=start) | Q(ready_at__gte=start)
        if criteria.date_to:
            end = day_end(criteria.date_to)
            q &= Q(uploaded_at__lte=end) | Q(ready_at__lte=end)

        if criteria.quick_filter == "today":
            today = timezone.localdate()
            q &= Q(uploaded_at__date=today) | Q(ready_at__date=today)
        elif criteria.quick_filter == "my_patients":
            # Tighten to encounter doctor (authenticated doctor's patients).
            q &= Q(**{f"{order}__encounter__doctor_id": doctor_id})

        if criteria.clinical_ready_only:
            q &= clinical_status_q_for_reports(
                status=ClinicalStatus.AVAILABLE
            ) | clinical_status_q_for_reports(status=ClinicalStatus.UPDATED)
        elif criteria.clinical_awaiting_only:
            q &= clinical_status_q_for_reports(status=ClinicalStatus.AWAITING_REPORT)
        elif criteria.status:
            q &= clinical_status_q_for_reports(status=criteria.status)

        return q

    @classmethod
    def build_for_lines(
        cls,
        criteria: WorkspaceListCriteria,
        *,
        doctor_id: Any,
    ) -> Q:
        q = Q()

        if criteria.patient_id:
            q &= Q(order__patient_profile_id=criteria.patient_id)
        if criteria.consultation_id:
            q &= Q(order__consultation_id=criteria.consultation_id)
        if criteria.encounter_id:
            q &= Q(order__encounter_id=criteria.encounter_id)
        if criteria.doctor_id:
            q &= Q(order__doctor_id=criteria.doctor_id)
        if criteria.lab_id:
            q &= Q(order__branch_id=criteria.lab_id)
        if criteria.category:
            q &= Q(service__category_id=criteria.category) | Q(
                service__category__code=criteria.category
            )

        if criteria.date_from:
            q &= Q(updated_at__gte=day_start(criteria.date_from))
        if criteria.date_to:
            q &= Q(updated_at__lte=day_end(criteria.date_to))

        if criteria.quick_filter == "today":
            q &= Q(updated_at__date=timezone.localdate())
        elif criteria.quick_filter == "my_patients":
            q &= Q(order__encounter__doctor_id=doctor_id)

        # Awaiting source: non-awaiting clinical status yields no rows.
        if criteria.status and criteria.status != ClinicalStatus.AWAITING_REPORT:
            return Q(pk__in=[])  # empty match without qs.none()

        return q
