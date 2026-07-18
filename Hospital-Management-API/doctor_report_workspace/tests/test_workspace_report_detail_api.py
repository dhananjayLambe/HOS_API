"""Service + API tests for workspace report detail."""

from __future__ import annotations

import uuid

from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.dto import WorkspaceReportDetailDTO
from doctor_report_workspace.services.workspace.workspace_report_detail_service import (
    WorkspaceReportDetailService,
    WorkspaceReportDetailValidationError,
    WorkspaceReportNotFound,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.user import UserFactory


class WorkspaceReportDetailServiceTests(TestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.service = WorkspaceReportDetailService()

    def test_returns_immutable_dto(self):
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        report = create_ready_report(line=line)
        dto = self.service.get_detail(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            report_id=report.id,
        )
        self.assertIsInstance(dto, WorkspaceReportDetailDTO)
        self.assertEqual(dto.clinical_status, ClinicalStatus.AVAILABLE)
        self.assertTrue(len(dto.artifacts) >= 1)
        self.assertIsNotNone(dto.timeline)
        payload = dto.to_dict()
        self.assertIn("artifacts", payload)
        self.assertIn("timeline", payload)
        self.assertIn("clinical_findings", payload)

    def test_not_found(self):
        with self.assertRaises(WorkspaceReportNotFound):
            self.service.get_detail(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id=uuid.uuid4(),
            )

    def test_invalid_uuid(self):
        with self.assertRaises(WorkspaceReportDetailValidationError):
            self.service.get_detail(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id="not-a-uuid",
            )


class WorkspaceReportDetailAPITests(APITestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        self.report = create_ready_report(line=line)
        self.url = reverse(
            "doctor_report_workspace:workspace-report-detail",
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

    def test_success_contract(self):
        self._auth()
        res = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["status"], "success")
        data = body["data"]
        for key in (
            "id",
            "patient",
            "test_name",
            "clinical_status",
            "artifacts",
            "timeline",
            "clinical_findings",
        ):
            self.assertIn(key, data)
        self.assertEqual(data["id"], str(self.report.id))
        self.assertIn("identifier", data["patient"])
        self.assertNotIn("uhid", data["patient"])
        self.assertIsInstance(data["artifacts"], list)
        self.assertIn("ordered_at", data["timeline"])
        if data["artifacts"]:
            art = data["artifacts"][0]
            self.assertTrue(art["is_primary"])
            self.assertEqual(art["label"], "Primary Report")
            self.assertIn(
                f"/workspace/reports/{self.report.id}/preview/",
                art["preview_url"],
            )
            self.assertIn(f"clinic_id={self.clinic.id}", art["preview_url"])
            self.assertIn(f"artifact_id={art['id']}", art["preview_url"])
            self.assertIn(
                f"/workspace/reports/{self.report.id}/download/",
                art["download_url"],
            )
            self.assertIn(f"clinic_id={self.clinic.id}", art["download_url"])
            self.assertIn(f"artifact_id={art['id']}", art["download_url"])
            blob = str(art).lower()
            self.assertNotIn("s3://", blob)
            self.assertNotIn("amazonaws", blob)
            self.assertNotIn("storage_key", blob)

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
            "doctor_report_workspace:workspace-report-detail",
            kwargs={"report_id": other_report.id},
        )
        self._auth()
        res = self.client.get(url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_report_404(self):
        url = reverse(
            "doctor_report_workspace:workspace-report-detail",
            kwargs={"report_id": uuid.uuid4()},
        )
        self._auth()
        res = self.client.get(url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
