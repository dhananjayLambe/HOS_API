"""API tests for workspace report download (302 + security)."""

from __future__ import annotations

import uuid
from unittest.mock import patch

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


class WorkspaceReportDownloadAPITests(APITestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        self.report = create_ready_report(line=line)
        self.url = reverse(
            "doctor_report_workspace:workspace-report-download",
            kwargs={"report_id": self.report.id},
        )

        self.other_user = UserFactory(username=f"91{uuid.uuid4().int % 10**10:010d}")
        ensure_doctor_group(self.other_user)
        self.other_clinic = ClinicFactory()
        self.other_doctor = DoctorFactory(
            user=self.other_user, clinics=(self.other_clinic,)
        )

        self.helpdesk_user = UserFactory(username=f"91{uuid.uuid4().int % 10**10:010d}")
        helpdesk, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user.groups.add(helpdesk)

    def _auth(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "ArtifactAccessService.generate_download_url",
        return_value="https://cdn.example/reports/opaque?sig=xyz",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "schedule_report_downloaded",
    )
    def test_302_location(self, _audit, _access):
        self._auth()
        res = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id)},
            follow=False,
        )
        self.assertEqual(res.status_code, status.HTTP_302_FOUND)
        self.assertEqual(
            res["Location"],
            "https://cdn.example/reports/opaque?sig=xyz",
        )
        body = res.content.decode("utf-8", errors="ignore").lower()
        self.assertNotIn("s3://", body)
        self.assertNotIn("storage_key", body)
        self.assertNotIn("bucket", body)

    def test_requires_auth(self):
        res = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertIn(
            res.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_requires_clinic_id(self):
        self._auth()
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_clinic_mismatch_forbidden(self):
        self._auth()
        res = self.client.get(self.url, {"clinic_id": str(self.other_clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_doctor_forbidden(self):
        self._auth(self.helpdesk_user)
        res = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cross_doctor_404(self):
        other_line, *_ = create_order_line(
            doctor=self.other_doctor,
            clinic=self.other_clinic,
            service_name="Secret",
        )
        other_report = create_ready_report(line=other_line)
        url = reverse(
            "doctor_report_workspace:workspace-report-download",
            kwargs={"report_id": other_report.id},
        )
        self._auth()
        res = self.client.get(url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_report_404(self):
        url = reverse(
            "doctor_report_workspace:workspace-report-download",
            kwargs={"report_id": uuid.uuid4()},
        )
        self._auth()
        res = self.client.get(url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "ArtifactAccessService.generate_download_url",
        return_value="https://cdn.example/opaque",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "schedule_report_downloaded",
    )
    def test_no_storage_leak_in_error_paths(self, _audit, _access):
        self._auth()
        res = self.client.get(
            reverse(
                "doctor_report_workspace:workspace-report-download",
                kwargs={"report_id": uuid.uuid4()},
            ),
            {"clinic_id": str(self.clinic.id)},
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        blob = str(res.content).lower()
        self.assertNotIn("s3://", blob)
        self.assertNotIn("storage_key", blob)
        self.assertNotIn("amazonaws", blob)
