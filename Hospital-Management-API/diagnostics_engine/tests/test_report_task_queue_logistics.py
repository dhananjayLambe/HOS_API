"""Report task queue logistics gating (visit check-in / home collect)."""

from __future__ import annotations

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from labs.choices.workflow import AppointmentStatus, CollectionStatus, LabAssignmentStatus
from labs.models import LabVisitAppointment
from labs.tests.support.workflow_factories import (
    accept_lab_visit,
    collection_at_status,
    home_assignment,
    lab_admin_client,
    lab_mode_assignment,
    visit_ready_for_report_queue,
)


class ReportTaskQueueLogisticsGateTests(APITestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def _queue_task_ids(self) -> set[str]:
        res = self.client.get(reverse("v1-report-task-queue"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return {str(row["task_id"]) for row in res.data["data"]["results"]}

    def test_visit_confirmed_only_excluded_from_queue(self):
        assignment, _order = lab_mode_assignment(self.branch)
        visit = accept_lab_visit(self.client, assignment)
        self.client.post(reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id}))
        visit.refresh_from_db()
        self.assertEqual(visit.status, AppointmentStatus.CONFIRMED)

        self.assertNotIn(str(assignment.id), self._queue_task_ids())

    def test_visit_checked_in_included_with_sample_collected_at(self):
        assignment, _order = lab_mode_assignment(self.branch)
        visit = visit_ready_for_report_queue(self.client, assignment)
        self.assertEqual(visit.status, AppointmentStatus.CHECKED_IN)
        self.assertIsNotNone(visit.checked_in_at)

        res = self.client.get(reverse("v1-report-task-queue"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        card = next(r for r in res.data["data"]["results"] if str(r["task_id"]) == str(assignment.id))
        self.assertIsNotNone(card["sample_collected_at"])
        self.assertEqual(card["order_workflow_state"], "pending_upload")

    def test_visit_completed_still_in_queue_while_reports_pending(self):
        assignment, _order = lab_mode_assignment(self.branch)
        visit = visit_ready_for_report_queue(self.client, assignment)
        res = self.client.post(reverse("lab-visit-appointment-complete", kwargs={"visit_id": visit.id}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.status, AppointmentStatus.COMPLETED)

        self.assertIn(str(assignment.id), self._queue_task_ids())

    def test_home_collected_included_in_queue(self):
        _collection, assignment, _order = collection_at_status(
            self.client,
            self.branch,
            CollectionStatus.COLLECTED,
        )
        self.assertIn(str(assignment.id), self._queue_task_ids())

    def test_home_accept_only_excluded_from_queue(self):
        assignment, _order = home_assignment(self.branch, assignment_status=LabAssignmentStatus.PENDING)
        accept_res = self.client.post(
            reverse("lab-order-accept", kwargs={"assignment_id": assignment.id}),
        )
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        self.assertNotIn(str(assignment.id), self._queue_task_ids())

    def test_visit_accept_only_without_appointment_check_in_excluded(self):
        assignment, order = lab_mode_assignment(self.branch)
        accept_res = self.client.post(
            reverse("lab-order-accept", kwargs={"assignment_id": assignment.id}),
        )
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        visit = LabVisitAppointment.objects.get(diagnostic_order=order)
        self.assertEqual(visit.status, AppointmentStatus.PENDING)
        self.assertNotIn(str(assignment.id), self._queue_task_ids())
