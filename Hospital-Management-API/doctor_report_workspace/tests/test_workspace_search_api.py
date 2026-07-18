"""HTTP API tests for workspace search."""

from __future__ import annotations

from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.user import UserFactory


class WorkspaceSearchAPITests(APITestCase):
    def setUp(self):
        self.url = reverse("doctor_report_workspace:workspace-search")
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        other_user = UserFactory(username="91000005555")
        ensure_doctor_group(other_user)
        self.other_clinic = ClinicFactory()
        self.other_doctor = DoctorFactory(user=other_user, clinics=(self.other_clinic,))
        self.helpdesk_user = UserFactory(username="91000004444")
        helpdesk, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user.groups.add(helpdesk)

    def _auth(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    def test_requires_auth(self):
        res = self.client.get(
            self.url, {"clinic_id": self.clinic.id, "q": "ab"}
        )
        self.assertIn(
            res.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_short_q_400(self):
        self._auth()
        res = self.client.get(
            self.url, {"clinic_id": str(self.clinic.id), "q": "a"}
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_q_400(self):
        self._auth()
        res = self.client.get(
            self.url, {"clinic_id": str(self.clinic.id), "q": "  "}
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_doctor_forbidden(self):
        self._auth(self.helpdesk_user)
        res = self.client.get(
            self.url, {"clinic_id": str(self.clinic.id), "q": "ab"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_search_success_contract(self):
        line, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_first="ApiSearch",
            patient_last="Patient",
        )
        create_ready_report(line=line)
        self._auth()
        res = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id), "q": "ApiSearch"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["status"], "success")
        data = body["data"]
        self.assertIn("reports", data)
        self.assertIn("pagination", data)
        self.assertEqual(len(data["reports"]), 1)
        self.assertIn("identifier", data["reports"][0]["patient"])

    def test_isolation(self):
        line, *_ = create_order_line(
            doctor=self.other_doctor,
            clinic=self.other_clinic,
            patient_first="Hidden",
            patient_last="Patient",
            service_name="HiddenSvc",
        )
        create_ready_report(line=line)
        self._auth()
        res = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id), "q": "Hidden"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.json()["data"]["reports"]), 0)

    def test_case_insensitive(self):
        line, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_first="CaseFold",
            patient_last="Test",
        )
        create_ready_report(line=line)
        self._auth()
        res = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id), "q": "casefold"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.json()["data"]["reports"]), 1)
