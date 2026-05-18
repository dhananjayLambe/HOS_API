"""
API contract tests for visit appointment workflow endpoints.
"""

from __future__ import annotations

import uuid

from django.test import TestCase
from django.urls import reverse
from rest_framework import status

from labs.api.helpers.visit_workflow_api import VISIT_NOT_FOUND_DETAIL
from labs.choices.workflow import AppointmentStatus
from labs.models import LabVisitAppointment
from labs.tests.support.visit_workflow_assertions import (
    WORKFLOW_POST_KEYS,
    assert_visit_workflow_post_contract,
)
from labs.tests.support.workflow_factories import accept_lab_visit, lab_admin_client, lab_mode_assignment

WORKFLOW_URL_NAMES = (
    "lab-visit-appointment-confirm",
    "lab-visit-appointment-check-in",
    "lab-visit-appointment-complete",
    "lab-visit-appointment-no-show",
    "lab-visit-appointment-reschedule",
)


class VisitWorkflowApiTests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def _pending_visit(self) -> LabVisitAppointment:
        assignment, _order = lab_mode_assignment(self.branch)
        return accept_lab_visit(self.client, assignment)

    def _confirmed_visit(self) -> LabVisitAppointment:
        visit = self._pending_visit()
        self.client.post(reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id}))
        visit.refresh_from_db()
        return visit

    def _checked_in_visit(self) -> LabVisitAppointment:
        visit = self._confirmed_visit()
        self.client.post(reverse("lab-visit-appointment-check-in", kwargs={"visit_id": visit.id}))
        visit.refresh_from_db()
        return visit

    def test_confirm_returns_contract(self):
        visit = self._pending_visit()
        res = self.client.post(
            reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id}),
        )
        assert_visit_workflow_post_contract(
            self,
            res,
            expected_status=AppointmentStatus.CONFIRMED,
        )
        self.assertIn("check_in", res.json()["allowed_actions"])

    def test_check_in_returns_contract(self):
        visit = self._confirmed_visit()
        res = self.client.post(
            reverse("lab-visit-appointment-check-in", kwargs={"visit_id": visit.id}),
        )
        assert_visit_workflow_post_contract(
            self,
            res,
            expected_status=AppointmentStatus.CHECKED_IN,
        )

    def test_complete_returns_contract(self):
        visit = self._checked_in_visit()
        res = self.client.post(
            reverse("lab-visit-appointment-complete", kwargs={"visit_id": visit.id}),
        )
        assert_visit_workflow_post_contract(
            self,
            res,
            expected_status=AppointmentStatus.COMPLETED,
        )
        self.assertEqual(res.json()["allowed_actions"], [])

    def test_no_show_returns_contract(self):
        visit = self._pending_visit()
        res = self.client.post(
            reverse("lab-visit-appointment-no-show", kwargs={"visit_id": visit.id}),
            {"reason": "Absent"},
            format="json",
        )
        assert_visit_workflow_post_contract(
            self,
            res,
            expected_status=AppointmentStatus.NO_SHOW,
        )

    def test_reschedule_returns_contract(self):
        visit = self._pending_visit()
        res = self.client.post(
            reverse("lab-visit-appointment-reschedule", kwargs={"visit_id": visit.id}),
            {"appointment_date": "2026-06-01", "appointment_slot": "9-11 AM"},
            format="json",
        )
        assert_visit_workflow_post_contract(
            self,
            res,
            expected_status=AppointmentStatus.RESCHEDULED,
        )

    def test_all_workflow_endpoints_share_response_keys(self):
        cases = [
            (
                "lab-visit-appointment-confirm",
                lambda: self._pending_visit(),
                {},
            ),
            (
                "lab-visit-appointment-check-in",
                lambda: self._confirmed_visit(),
                {},
            ),
            (
                "lab-visit-appointment-complete",
                lambda: self._checked_in_visit(),
                {},
            ),
            (
                "lab-visit-appointment-no-show",
                lambda: self._pending_visit(),
                {"reason": ""},
            ),
            (
                "lab-visit-appointment-reschedule",
                lambda: self._pending_visit(),
                {"appointment_date": "2026-06-15", "appointment_slot": "10:00"},
            ),
        ]
        for url_name, visit_factory, body in cases:
            visit = visit_factory()
            res = self.client.post(
                reverse(url_name, kwargs={"visit_id": visit.id}),
                body,
                format="json",
            )
            self.assertEqual(res.status_code, status.HTTP_200_OK, msg=url_name)
            self.assertEqual(set(res.json().keys()), WORKFLOW_POST_KEYS, msg=url_name)

    def test_invalid_transition_detail_409(self):
        visit = self._pending_visit()
        complete_url = reverse("lab-visit-appointment-complete", kwargs={"visit_id": visit.id})
        res = self.client.post(complete_url)
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        data = res.json()
        self.assertEqual(list(data.keys()), ["detail"])
        self.assertIn("Cannot transition", data["detail"])

        confirm_url = reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id})
        self.client.post(confirm_url)
        res = self.client.post(confirm_url)
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("Cannot transition", res.json()["detail"])

    def test_invalid_transition_returns_409(self):
        visit = self._pending_visit()
        url = reverse("lab-visit-appointment-complete", kwargs={"visit_id": visit.id})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_double_confirm_returns_409(self):
        visit = self._pending_visit()
        url = reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id})
        self.client.post(url)
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_cross_branch_returns_404(self):
        visit = self._pending_visit()
        other_client, _other_lu, _other_br, _org = lab_admin_client(branch_name="Other API")
        url = reverse("lab-visit-appointment-confirm", kwargs={"visit_id": visit.id})
        res = other_client.post(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.json(), {"detail": VISIT_NOT_FOUND_DETAIL})

    def test_cross_branch_404_all_endpoints(self):
        visit = self._pending_visit()
        other_client, _other_lu, _other_br, _org = lab_admin_client(branch_name="Other Branch API")
        for url_name in WORKFLOW_URL_NAMES:
            url = reverse(url_name, kwargs={"visit_id": visit.id})
            res = other_client.post(url, {}, format="json")
            self.assertEqual(
                res.status_code,
                status.HTTP_404_NOT_FOUND,
                msg=url_name,
            )
            self.assertEqual(
                res.json(),
                {"detail": VISIT_NOT_FOUND_DETAIL},
                msg=url_name,
            )

    def test_unknown_visit_id_404(self):
        unknown_id = uuid.uuid4()
        url = reverse("lab-visit-appointment-confirm", kwargs={"visit_id": unknown_id})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.json(), {"detail": VISIT_NOT_FOUND_DETAIL})
        self.assertNotIn("traceback", res.json())
        self.assertNotIn("exception", res.json())
