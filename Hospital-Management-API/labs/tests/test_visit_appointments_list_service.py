"""Tests for visit appointments list service and API."""

from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.urls import reverse
from django.utils import timezone

from labs.api.services.shared_date_presets import date_range_from_preset
from labs.api.services.visit_appointments_list_service import (
    VisitAppointmentsListParams,
    apply_list_filters,
    apply_ordering,
    base_visit_queryset,
    build_row_dtos,
    normalize_search_query,
    parse_list_params,
)
from labs.choices.workflow import AppointmentStatus, LabAssignmentStatus
from labs.models import LabVisitAppointment
from labs.services.visit_workflow import allowed_actions_for_status, workflow_hint_for_status
from labs.tests.support.workflow_factories import (
    accept_lab_visit,
    lab_admin_client,
    lab_mode_assignment,
)


class VisitAppointmentsListServiceTests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, self.org = lab_admin_client()

    def _accept_visit(
        self,
        *,
        status: str = AppointmentStatus.PENDING,
        appointment_date=None,
        branch=None,
        client=None,
        lab_user=None,
    ) -> LabVisitAppointment:
        branch = branch or self.branch
        client = client or self.client
        lab_user = lab_user or self.lab_user
        assignment, _order = lab_mode_assignment(branch)
        visit = accept_lab_visit(client, assignment)
        if appointment_date is not None:
            visit.appointment_date = appointment_date
            visit.save(update_fields=["appointment_date", "updated_at"])
        if status != AppointmentStatus.PENDING:
            visit.status = status
            visit.save(update_fields=["status", "updated_at"])
        return visit

    def _list_ids(self, **params) -> set[str]:
        p = VisitAppointmentsListParams(**params)
        qs = apply_ordering(
            apply_list_filters(base_visit_queryset(self.lab_user), p),
            p,
        )
        return {str(v.id) for v in qs}

    def test_branch_isolation(self):
        visit = self._accept_visit()
        _c, other_lu, other_br, _org = lab_admin_client(branch_name="Other Visit Branch")
        other_visit = self._accept_visit(branch=other_br, client=_c, lab_user=other_lu)

        ids = self._list_ids()
        self.assertIn(str(visit.id), ids)
        self.assertNotIn(str(other_visit.id), ids)

    def test_queue_excludes_pending_assignment_without_accept(self):
        assignment, _ = lab_mode_assignment(self.branch)
        self.assertFalse(LabVisitAppointment.objects.filter(diagnostic_order=assignment.diagnostic_order).exists())
        self.assertEqual(len(self._list_ids()), 0)

    def test_queue_excludes_rejected_assignment_visit(self):
        assignment, order = lab_mode_assignment(self.branch)
        accept_lab_visit(self.client, assignment)
        visit = LabVisitAppointment.objects.get(diagnostic_order=order)
        assignment.status = LabAssignmentStatus.REJECTED
        assignment.save(update_fields=["status", "updated_at"])
        self.assertNotIn(str(visit.id), self._list_ids())

    def test_queue_includes_in_progress_assignment(self):
        assignment, order = lab_mode_assignment(self.branch)
        accept_lab_visit(self.client, assignment)
        assignment.status = LabAssignmentStatus.IN_PROGRESS
        assignment.save(update_fields=["status", "updated_at"])
        visit = LabVisitAppointment.objects.get(diagnostic_order=order)
        self.assertIn(str(visit.id), self._list_ids())

    def test_scheduled_tab_includes_pending_and_rescheduled(self):
        pending = self._accept_visit(status=AppointmentStatus.PENDING)
        rescheduled = self._accept_visit(status=AppointmentStatus.RESCHEDULED)
        confirmed = self._accept_visit(status=AppointmentStatus.CONFIRMED)

        ids = self._list_ids(status="scheduled")
        self.assertIn(str(pending.id), ids)
        self.assertIn(str(rescheduled.id), ids)
        self.assertNotIn(str(confirmed.id), ids)

    def test_confirmed_checked_in_completed_failed_tabs(self):
        confirmed = self._accept_visit(status=AppointmentStatus.CONFIRMED)
        checked_in = self._accept_visit(status=AppointmentStatus.CHECKED_IN)
        completed = self._accept_visit(status=AppointmentStatus.COMPLETED)
        no_show = self._accept_visit(status=AppointmentStatus.NO_SHOW)

        self.assertEqual(self._list_ids(status="confirmed"), {str(confirmed.id)})
        self.assertEqual(self._list_ids(status="checked_in"), {str(checked_in.id)})
        self.assertEqual(self._list_ids(status="completed"), {str(completed.id)})
        self.assertEqual(self._list_ids(status="failed"), {str(no_show.id)})

    def test_raw_confirmed_status_param(self):
        confirmed = self._accept_visit(status=AppointmentStatus.CONFIRMED)
        self.assertEqual(self._list_ids(status="CONFIRMED"), {str(confirmed.id)})

    def test_search_by_order_number_and_patient_name(self):
        visit = self._accept_visit()
        order = visit.diagnostic_order
        profile = order.patient_profile
        profile.first_name = "Zephyr"
        profile.last_name = "QueueTest"
        profile.save(update_fields=["first_name", "last_name"])

        self.assertIn(str(visit.id), self._list_ids(q=order.order_number))
        self.assertIn(str(visit.id), self._list_ids(q="Zephyr"))
        self.assertIn(str(visit.id), self._list_ids(q="QueueTest"))

    def test_search_by_visit_id_distinct(self):
        visit = self._accept_visit()
        partial = str(visit.id).replace("-", "")[:8]
        p = VisitAppointmentsListParams(q=partial)
        qs = apply_list_filters(base_visit_queryset(self.lab_user), p)
        self.assertEqual(qs.filter(id=visit.id).count(), 1)
        self.assertEqual(qs.distinct().count(), qs.count())

    def test_date_preset_today(self):
        today = timezone.localdate()
        visit = self._accept_visit(appointment_date=today)
        tomorrow = self._accept_visit(appointment_date=today + timedelta(days=1))

        ids = self._list_ids(date_from=today, date_to=today)
        self.assertIn(str(visit.id), ids)
        self.assertNotIn(str(tomorrow.id), ids)

    def test_date_preset_week_monday_sunday(self):
        today = timezone.localdate()
        week_start, week_end = date_range_from_preset("week")
        self.assertIsNotNone(week_start)
        in_week = self._accept_visit(appointment_date=week_start)
        out_week = self._accept_visit(appointment_date=week_end + timedelta(days=7))

        ids = self._list_ids(date_from=week_start, date_to=week_end)
        self.assertIn(str(in_week.id), ids)
        self.assertNotIn(str(out_week.id), ids)

    def test_ordering_deterministic_tiebreaker(self):
        today = timezone.localdate()
        self._accept_visit(appointment_date=today, status=AppointmentStatus.CONFIRMED)
        self._accept_visit(appointment_date=today, status=AppointmentStatus.PENDING)
        p = VisitAppointmentsListParams(ordering="-appointment_date")

        def ordered_ids():
            qs = apply_ordering(apply_list_filters(base_visit_queryset(self.lab_user), p), p)
            return [str(v.id) for v in qs if v.appointment_date == today]

        self.assertEqual(ordered_ids(), ordered_ids())

    def test_base_queryset_requires_appointment_date(self):
        """DB enforces NOT NULL; base queryset also filters appointment_date__isnull=False."""
        visit = self._accept_visit()
        self.assertIsNotNone(visit.appointment_date)
        qs = base_visit_queryset(self.lab_user)
        self.assertTrue(qs.filter(id=visit.id).exists())

    def test_presenter_uses_visit_workflow_contract(self):
        visit = self._accept_visit(status=AppointmentStatus.CONFIRMED)
        dto = build_row_dtos([visit])[0]
        self.assertEqual(dto.allowed_actions, allowed_actions_for_status(AppointmentStatus.CONFIRMED))
        self.assertEqual(dto.workflow_hint, workflow_hint_for_status(AppointmentStatus.CONFIRMED))
        self.assertEqual(dto.status_updated_at, visit.status_changed_at or visit.updated_at)

    def test_normalize_search_query_phone(self):
        q, phone = normalize_search_query("  +91 91234-56789 ")
        self.assertEqual(q, "+91 91234-56789")
        self.assertEqual(phone, "919123456789")

    def test_parse_list_params_defaults(self):
        params = parse_list_params({})
        self.assertEqual(params.ordering, "-appointment_date")
        self.assertEqual(params.page, 1)
        self.assertEqual(params.page_size, 20)


class VisitAppointmentsListAPITests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, self.org = lab_admin_client()

    def _accept_visit(self, **kwargs) -> LabVisitAppointment:
        assignment, _ = lab_mode_assignment(self.branch)
        visit = accept_lab_visit(self.client, assignment)
        if kwargs.get("status"):
            visit.status = kwargs["status"]
            visit.save(update_fields=["status", "updated_at"])
        return visit

    def test_list_api_pagination_contract(self):
        self._accept_visit()
        self._accept_visit(status=AppointmentStatus.CONFIRMED)
        res = self.client.get(
            reverse("lab-visit-appointments-list"),
            {"page": 1, "page_size": 1},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["page_size"], 1)
        self.assertGreaterEqual(data["total"], 2)
        self.assertGreaterEqual(data["total_pages"], 2)
        self.assertEqual(len(data["results"]), 1)
        row = data["results"][0]
        for key in (
            "workflow_hint",
            "allowed_actions",
            "appointment_status",
            "appointment_id",
            "order_number",
        ):
            self.assertIn(key, row)

    def test_list_api_query_count_bounded(self):
        for _ in range(3):
            self._accept_visit()
        url = reverse("lab-visit-appointments-list")
        with CaptureQueriesContext(connection) as ctx:
            res = self.client.get(url, {"page_size": 10})
        self.assertEqual(res.status_code, 200)
        self.assertLessEqual(len(ctx.captured_queries), 25)
