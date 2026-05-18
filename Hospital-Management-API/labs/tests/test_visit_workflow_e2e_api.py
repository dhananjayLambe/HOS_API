"""
HTTP end-to-end tests for visit appointment workflow (Phase 5 items 99–104).
"""

from __future__ import annotations

import threading

from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework import status

from labs.choices.workflow import AppointmentStatus
from labs.models import ACTIVE_TEST_EXECUTION_STATUSES, LabOrderTestExecution, LabVisitAppointment
from labs.tests.support.visit_workflow_assertions import (
    assert_visit_workflow_post_contract,
)
from labs.tests.support.workflow_factories import accept_lab_visit, lab_admin_client, lab_mode_assignment


class VisitWorkflowLifecycleApiTests(TestCase):
    """99 — complete visit lifecycle via real API."""

    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, _order = lab_mode_assignment(self.branch)
        return accept_lab_visit(self.client, assignment)

    def test_full_visit_lifecycle_via_http(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        line_count = visit.diagnostic_order.test_lines.count()

        confirm_url = reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id})
        res = self.client.post(confirm_url)
        assert_visit_workflow_post_contract(self, res, expected_status=AppointmentStatus.CONFIRMED)
        self.assertEqual(LabOrderTestExecution.objects.filter(assignment=assignment).count(), 0)

        check_in_url = reverse("lab-visit-appointment-check-in", kwargs={"visit_id": visit.id})
        res = self.client.post(check_in_url)
        assert_visit_workflow_post_contract(self, res, expected_status=AppointmentStatus.CHECKED_IN)
        self.assertEqual(
            LabOrderTestExecution.objects.filter(assignment=assignment).count(),
            line_count,
        )

        complete_url = reverse("lab-visit-appointment-complete", kwargs={"visit_id": visit.id})
        res = self.client.post(complete_url)
        assert_visit_workflow_post_contract(self, res, expected_status=AppointmentStatus.COMPLETED)
        self.assertEqual(res.json()["allowed_actions"], [])
        self.assertEqual(
            LabOrderTestExecution.objects.filter(assignment=assignment).count(),
            line_count,
        )

        res = self.client.post(confirm_url)
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)


class VisitWorkflowNoShowApiTests(TestCase):
    """100 — no-show lifecycle via real API."""

    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, _order = lab_mode_assignment(self.branch)
        return accept_lab_visit(self.client, assignment)

    def test_no_show_from_pending_via_http(self):
        visit = self._pending_visit()
        url = reverse("lab-visit-appointment-no-show", kwargs={"visit_id": visit.id})
        res = self.client.post(url, {"reason": "Absent"}, format="json")
        assert_visit_workflow_post_contract(self, res, expected_status=AppointmentStatus.NO_SHOW)
        self.assertEqual(res.json()["allowed_actions"], [])

    def test_no_show_from_checked_in_via_http(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        line_count = visit.diagnostic_order.test_lines.count()
        self.client.post(reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id}))
        self.client.post(reverse("lab-visit-appointment-check-in", kwargs={"visit_id": visit.id}))
        count_before = LabOrderTestExecution.objects.filter(assignment=assignment).count()
        self.assertEqual(count_before, line_count)

        url = reverse("lab-visit-appointment-no-show", kwargs={"visit_id": visit.id})
        res = self.client.post(url, {"reason": "Left"}, format="json")
        assert_visit_workflow_post_contract(self, res, expected_status=AppointmentStatus.NO_SHOW)
        self.assertEqual(
            LabOrderTestExecution.objects.filter(assignment=assignment).count(),
            count_before,
        )


class VisitWorkflowProvisioningApiTests(TestCase):
    """101, 104 — provisioning and retry-safe execution creation via HTTP."""

    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, _order = lab_mode_assignment(self.branch)
        return accept_lab_visit(self.client, assignment)

    def test_check_in_provisions_executions_via_http(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        line_count = visit.diagnostic_order.test_lines.count()

        self.client.post(reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id}))
        check_in_url = reverse("lab-visit-appointment-check-in", kwargs={"visit_id": visit.id})
        res = self.client.post(check_in_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        rows = LabOrderTestExecution.objects.filter(assignment=assignment)
        self.assertEqual(rows.count(), line_count)
        for row in rows:
            self.assertEqual(row.visit_appointment_id, visit.id)
            self.assertIsNone(row.collection_request_id)

    def test_double_check_in_via_http_is_idempotent_for_executions(self):
        visit = self._pending_visit()
        assignment = visit.diagnostic_order.lab_assignment
        line_count = visit.diagnostic_order.test_lines.count()
        check_in_url = reverse("lab-visit-appointment-check-in", kwargs={"visit_id": visit.id})

        self.client.post(reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id}))
        res1 = self.client.post(check_in_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        count_after_first = LabOrderTestExecution.objects.filter(assignment=assignment).count()
        self.assertEqual(count_after_first, line_count)

        res2 = self.client.post(check_in_url)
        self.assertEqual(res2.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            LabOrderTestExecution.objects.filter(assignment=assignment).count(),
            count_after_first,
        )
        active_count = LabOrderTestExecution.objects.filter(
            assignment=assignment,
            execution_status__in=ACTIVE_TEST_EXECUTION_STATUSES,
        ).count()
        self.assertEqual(active_count, line_count)


class VisitWorkflowConcurrencyApiTests(TransactionTestCase):
    """102 — concurrency against real API."""

    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()
        self.auth_user = self.lab_user.user

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, _order = lab_mode_assignment(self.branch)
        return accept_lab_visit(self.client, assignment)

    def _run_concurrent_posts(self, url: str, body: dict | None = None):
        barrier = threading.Barrier(2)
        results: list = []

        def attempt():
            barrier.wait()
            from rest_framework.test import APIClient

            client = APIClient()
            client.force_authenticate(user=self.auth_user)
            if body is None:
                results.append(client.post(url))
            else:
                results.append(client.post(url, body, format="json"))

        t1 = threading.Thread(target=attempt)
        t2 = threading.Thread(target=attempt)
        t1.start()
        t2.start()
        t1.join()
        t2.join()
        return results

    def test_concurrent_double_confirm_via_http(self):
        visit = self._pending_visit()
        url = reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id})
        results = self._run_concurrent_posts(url)
        statuses = sorted(r.status_code for r in results)
        self.assertEqual(statuses, [status.HTTP_200_OK, status.HTTP_409_CONFLICT])
        visit.refresh_from_db()
        self.assertEqual(visit.status, AppointmentStatus.CONFIRMED)


class VisitWorkflowBranchIsolationApiTests(TestCase):
    """103 — branch isolation end-to-end via HTTP."""

    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def test_lifecycle_stays_within_accepting_branch(self):
        assignment, _order = lab_mode_assignment(self.branch)
        visit = accept_lab_visit(self.client, assignment)
        other_client, _other_lu, _other_br, _org = lab_admin_client(branch_name="Isolation Branch")

        confirm_url = reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id})
        self.assertEqual(self.client.post(confirm_url).status_code, status.HTTP_200_OK)
        self.assertEqual(other_client.post(confirm_url).status_code, status.HTTP_404_NOT_FOUND)

        check_in_url = reverse("lab-visit-appointment-check-in", kwargs={"visit_id": visit.id})
        self.assertEqual(self.client.post(check_in_url).status_code, status.HTTP_200_OK)
        self.assertEqual(other_client.post(check_in_url).status_code, status.HTTP_404_NOT_FOUND)
