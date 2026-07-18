"""HTTP API tests for workspace list + summary."""

from __future__ import annotations

from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
    mark_line_pending_upload,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.user import UserFactory


class WorkspaceAPITests(APITestCase):
    def setUp(self):
        self.list_url = reverse("doctor_report_workspace:workspace-list")
        self.summary_url = reverse("doctor_report_workspace:workspace-summary")
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()

        self.other_user = UserFactory(username="91000008888")
        ensure_doctor_group(self.other_user)
        self.other_clinic = ClinicFactory()
        self.other_doctor = DoctorFactory(
            user=self.other_user, clinics=(self.other_clinic,)
        )

        self.helpdesk_user = UserFactory(username="91000007777")
        helpdesk, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user.groups.add(helpdesk)

    def _auth(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    def test_list_requires_auth(self):
        res = self.client.get(self.list_url, {"clinic_id": self.clinic.id})
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_list_requires_clinic_id(self):
        self._auth()
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_doctor_forbidden(self):
        self._auth(self.helpdesk_user)
        res = self.client.get(self.list_url, {"clinic_id": self.clinic.id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_clinic_mismatch_forbidden(self):
        self._auth()
        res = self.client.get(self.list_url, {"clinic_id": self.other_clinic.id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_success_contract(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        self._auth()
        res = self.client.get(self.list_url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["status"], "success")
        data = body["data"]
        self.assertIn("reports", data)
        self.assertIn("pagination", data)
        self.assertEqual(data["pagination"]["page_size"], 25)
        self.assertEqual(len(data["reports"]), 1)
        row = data["reports"][0]
        self.assertEqual(row["clinical_status"], ClinicalStatus.AVAILABLE)
        self.assertIn("identifier", row["patient"])
        self.assertNotIn("uhid", row["patient"])

    def test_doctor_isolation(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        other_line, *_ = create_order_line(
            doctor=self.other_doctor,
            clinic=self.other_clinic,
            service_name="Secret",
        )
        create_ready_report(line=other_line)

        self._auth()
        res = self.client.get(self.list_url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.json()["data"]["reports"]), 1)

    def test_invalid_ordering_400(self):
        self._auth()
        res = self.client.get(
            self.list_url,
            {"clinic_id": str(self.clinic.id), "ordering": "drop_table"},
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_summary_success(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        create_ready_report(line=line)
        pending, *_ = create_order_line(
            doctor=self.doctor, clinic=self.clinic, service_name="Await"
        )
        mark_line_pending_upload(line=pending)

        self._auth()
        res = self.client.get(self.summary_url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        summary = res.json()["data"]["summary"]
        self.assertEqual(summary["reports_ready"], 1)
        self.assertEqual(summary["awaiting"], 1)
        self.assertEqual(summary["critical"], 0)

    def test_queue_awaiting(self):
        pending, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        mark_line_pending_upload(line=pending)
        self._auth()
        res = self.client.get(
            self.list_url,
            {"clinic_id": str(self.clinic.id), "queue": "awaiting"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        reports = res.json()["data"]["reports"]
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]["clinical_status"], ClinicalStatus.AWAITING_REPORT)
