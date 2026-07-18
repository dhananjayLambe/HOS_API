"""Service tests for WorkspaceReportDownloadService."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.test import TestCase

from doctor_report_workspace.services.artifacts.artifact_access_service import (
    ArtifactAccessError,
)
from doctor_report_workspace.services.workspace.workspace_report_detail_service import (
    WorkspaceReportNotFound,
)
from doctor_report_workspace.services.workspace.workspace_report_download_service import (
    DownloadResult,
    WorkspaceReportDownloadService,
    WorkspaceReportDownloadValidationError,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
)


class WorkspaceReportDownloadServiceTests(TestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.service = WorkspaceReportDownloadService()
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        self.report = create_ready_report(line=line)

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "ArtifactAccessService.generate_download_url",
        return_value="https://cdn.example/opaque?X-Amz-Signature=abc",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "schedule_report_downloaded",
    )
    def test_audit_before_access(self, mock_audit, mock_access):
        order = []

        def audit_side(*args, **kwargs):
            order.append("audit")

        def access_side(*args, **kwargs):
            order.append("access")
            return "https://cdn.example/opaque"

        mock_audit.side_effect = audit_side
        mock_access.side_effect = access_side

        result = self.service.get_download(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            report_id=self.report.id,
            user=self.user,
        )
        self.assertIsInstance(result, DownloadResult)
        self.assertEqual(order, ["audit", "access"])
        mock_audit.assert_called_once()
        kwargs = mock_audit.call_args.kwargs
        self.assertEqual(kwargs["user"], self.user)
        self.assertEqual(kwargs["download_channel"], "Web")
        self.assertEqual(str(kwargs["report"].id), str(self.report.id))
        self.assertTrue(kwargs.get("artifact_id"))
        for forbidden in ("url", "storage_key", "bucket", "key"):
            self.assertNotIn(forbidden, kwargs)

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "ArtifactAccessService.generate_download_url",
        return_value="https://cdn.example/opaque",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "schedule_report_downloaded",
    )
    def test_primary_via_artifact_service(self, _audit, mock_access):
        result = self.service.get_download(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            report_id=self.report.id,
            user=self.user,
        )
        self.assertTrue(result.url.startswith("https://"))
        self.assertTrue(result.artifact_id)
        mock_access.assert_called_once()

    def test_not_found(self):
        with self.assertRaises(WorkspaceReportNotFound):
            self.service.get_download(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id=uuid.uuid4(),
                user=self.user,
            )

    def test_invalid_uuid(self):
        with self.assertRaises(WorkspaceReportDownloadValidationError):
            self.service.get_download(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id="bad",
                user=self.user,
            )

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "_local_file_streamable",
        return_value=False,
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "ArtifactAccessService.generate_download_url",
        side_effect=ArtifactAccessError("unavailable"),
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "schedule_report_downloaded",
    )
    def test_access_failure_after_audit_still_404(self, mock_audit, _access, _stream):
        with self.assertRaises(WorkspaceReportNotFound):
            self.service.get_download(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id=self.report.id,
                user=self.user,
            )
        mock_audit.assert_called_once()

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "ArtifactAccessService.generate_download_url",
        return_value="https://cdn.example/dl?sig=sec",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "schedule_report_downloaded",
    )
    def test_artifact_id_selects_secondary(self, mock_audit, mock_access):
        from diagnostics_engine.models.reports import DiagnosticReportArtifact
        from doctor_report_workspace.tests.support import pdf

        secondary = DiagnosticReportArtifact.objects.create(
            report=self.report,
            artifact_type="CSV",
            is_primary=False,
            is_active=True,
            file=pdf(b"col,a\n1,2"),
            original_filename="results.csv",
            download_filename="results.csv",
            content_type="text/csv",
        )
        result = self.service.get_download(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            report_id=self.report.id,
            user=self.user,
            artifact_id=str(secondary.id),
        )
        self.assertEqual(result.artifact_id, str(secondary.id))
        self.assertEqual(mock_audit.call_args.kwargs["artifact_id"], str(secondary.id))
        mock_access.assert_called_once()

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_download_service."
        "ArtifactAccessService.generate_download_url",
    )
    def test_artifact_id_from_other_report_404(self, mock_access):
        from doctor_report_workspace.tests.support import create_order_line, create_ready_report
        from diagnostics_engine.models.reports import DiagnosticReportArtifact

        line2, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        other = create_ready_report(line=line2)
        foreign = DiagnosticReportArtifact.objects.filter(report=other).first()
        with self.assertRaises(WorkspaceReportNotFound):
            self.service.get_download(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id=self.report.id,
                user=self.user,
                artifact_id=str(foreign.id),
            )
        mock_access.assert_not_called()
