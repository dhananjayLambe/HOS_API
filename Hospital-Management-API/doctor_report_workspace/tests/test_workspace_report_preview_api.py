"""API tests for workspace report preview (302 + unsupported JSON + security)."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from diagnostics_engine.models.reports import DiagnosticReportArtifact

from doctor_report_workspace.services.artifacts.artifact_access_service import (
    ArtifactAccessError,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
    pdf,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.user import UserFactory


class WorkspaceReportPreviewAPITests(APITestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        self.report = create_ready_report(line=line)
        self.url = reverse(
            "doctor_report_workspace:workspace-report-preview",
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
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "ArtifactAccessService.generate_preview_url",
        return_value="https://cdn.example/reports/inline?sig=xyz",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "schedule_report_viewed",
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
            "https://cdn.example/reports/inline?sig=xyz",
        )
        body = res.content.decode("utf-8", errors="ignore").lower()
        self.assertNotIn("s3://", body)
        self.assertNotIn("storage_key", body)
        self.assertNotIn("bucket", body)

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "ArtifactAccessService.generate_preview_url",
        side_effect=ArtifactAccessError("no s3"),
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "schedule_report_viewed",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "reports_local_stream_enabled",
        return_value=True,
    )
    def test_local_stream_when_s3_unavailable(self, _local, _audit, _access):
        """Without S3, stream authenticated PDF bytes (local MEDIA_ROOT)."""
        self._auth()
        res = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id)},
            follow=False,
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("pdf", (res.get("Content-Type") or "").lower())
        body = b"".join(res.streaming_content)
        self.assertTrue(body.startswith(b"%PDF"))
        self.assertNotIn(b"storage_key", body[:200].lower())


    def test_unsupported_200(self):
        DiagnosticReportArtifact.objects.filter(report=self.report).update(
            is_active=False
        )
        DiagnosticReportArtifact.objects.create(
            report=self.report,
            artifact_type="OTHER",
            is_primary=True,
            is_active=True,
            file=pdf(b"%PDF-1.4 other"),
            original_filename="pack.zip",
            download_filename="pack.zip",
        )
        self._auth()
        with patch(
            "doctor_report_workspace.services.workspace.workspace_report_preview_service."
            "ArtifactAccessService.generate_preview_url"
        ) as mock_access:
            res = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["status"], "success")
        data = body["data"]
        self.assertFalse(data["preview_supported"])
        self.assertIsNone(data["preview_url"])
        self.assertIsNone(data["artifact_type"])
        self.assertIsNone(data["expires_at"])
        mock_access.assert_not_called()
        blob = str(body).lower()
        self.assertNotIn("s3://", blob)
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
            "doctor_report_workspace:workspace-report-preview",
            kwargs={"report_id": other_report.id},
        )
        self._auth()
        res = self.client.get(url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_report_404(self):
        url = reverse(
            "doctor_report_workspace:workspace-report-preview",
            kwargs={"report_id": uuid.uuid4()},
        )
        self._auth()
        res = self.client.get(url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "ArtifactAccessService.generate_preview_url",
        return_value="https://cdn.example/reports/inline?sig=secondary",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "schedule_report_viewed",
    )
    def test_artifact_id_query_selects_secondary(self, mock_audit, _access):
        secondary = DiagnosticReportArtifact.objects.create(
            report=self.report,
            artifact_type="IMAGE",
            is_primary=False,
            is_active=True,
            file=pdf(b"%PDF-1.4 image"),
            original_filename="scan.png",
            download_filename="scan.png",
            content_type="image/png",
        )
        self._auth()
        res = self.client.get(
            self.url,
            {
                "clinic_id": str(self.clinic.id),
                "artifact_id": str(secondary.id),
            },
            follow=False,
        )
        self.assertEqual(res.status_code, status.HTTP_302_FOUND)
        self.assertEqual(
            mock_audit.call_args.kwargs["artifact_id"],
            str(secondary.id),
        )

    def test_artifact_id_wrong_report_404(self):
        other_line, *_ = create_order_line(
            doctor=self.doctor,
            clinic=self.clinic,
            service_name="Other",
        )
        other_report = create_ready_report(line=other_line)
        foreign = DiagnosticReportArtifact.objects.filter(report=other_report).first()
        self._auth()
        res = self.client.get(
            self.url,
            {
                "clinic_id": str(self.clinic.id),
                "artifact_id": str(foreign.id),
            },
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_doctor_artifact_uuid_404(self):
        """Doctor A must not preview Doctor B's artifact UUID on B's report."""
        other_line, *_ = create_order_line(
            doctor=self.other_doctor,
            clinic=self.other_clinic,
            service_name="Secret",
        )
        other_report = create_ready_report(line=other_line)
        foreign = DiagnosticReportArtifact.objects.filter(report=other_report).first()
        url = reverse(
            "doctor_report_workspace:workspace-report-preview",
            kwargs={"report_id": other_report.id},
        )
        self._auth()
        res = self.client.get(
            url,
            {
                "clinic_id": str(self.clinic.id),
                "artifact_id": str(foreign.id),
            },
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
