"""Service tests for WorkspaceReportPreviewService."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.test import TestCase

from diagnostics_engine.models.reports import DiagnosticReportArtifact

from doctor_report_workspace.services.artifacts.artifact_access_service import (
    ArtifactAccessError,
)
from doctor_report_workspace.services.workspace.workspace_report_detail_service import (
    WorkspaceReportNotFound,
)
from doctor_report_workspace.services.workspace.workspace_report_preview_service import (
    PreviewResult,
    WorkspaceReportPreviewService,
    WorkspaceReportPreviewValidationError,
)
from doctor_report_workspace.tests.support import (
    create_order_line,
    create_ready_report,
    make_doctor_with_clinic,
    pdf,
)


class WorkspaceReportPreviewServiceTests(TestCase):
    def setUp(self):
        self.user, self.doctor, self.clinic = make_doctor_with_clinic()
        self.service = WorkspaceReportPreviewService()
        line, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        self.report = create_ready_report(line=line)

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "ArtifactAccessService.generate_preview_url",
        return_value="https://cdn.example/inline?sig=abc",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "schedule_report_viewed",
    )
    def test_audit_before_access(self, mock_audit, mock_access):
        order = []

        def audit_side(*args, **kwargs):
            order.append("audit")

        def access_side(*args, **kwargs):
            order.append("access")
            return "https://cdn.example/inline"

        mock_audit.side_effect = audit_side
        mock_access.side_effect = access_side

        result = self.service.get_preview(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            report_id=self.report.id,
            user=self.user,
        )
        self.assertIsInstance(result, PreviewResult)
        self.assertTrue(result.supported)
        self.assertEqual(order, ["audit", "access"])
        mock_audit.assert_called_once()
        kwargs = mock_audit.call_args.kwargs
        self.assertEqual(kwargs["user"], self.user)
        self.assertEqual(kwargs["viewer_platform"], "Web")
        self.assertTrue(kwargs.get("artifact_id"))
        for forbidden in ("url", "storage_key", "bucket", "key"):
            self.assertNotIn(forbidden, kwargs)

    def test_unsupported_when_other_only(self):
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
        with patch(
            "doctor_report_workspace.services.workspace.workspace_report_preview_service."
            "ArtifactAccessService.generate_preview_url"
        ) as mock_access:
            result = self.service.get_preview(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id=self.report.id,
                user=self.user,
            )
        self.assertFalse(result.supported)
        mock_access.assert_not_called()
        dto = result.to_unsupported_dto()
        self.assertFalse(dto.preview_supported)
        self.assertIsNone(dto.preview_url)

    def test_not_found(self):
        with self.assertRaises(WorkspaceReportNotFound):
            self.service.get_preview(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id=uuid.uuid4(),
                user=self.user,
            )

    def test_invalid_uuid(self):
        with self.assertRaises(WorkspaceReportPreviewValidationError):
            self.service.get_preview(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id="bad",
                user=self.user,
            )

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "_local_file_streamable",
        return_value=False,
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "ArtifactAccessService.generate_preview_url",
        side_effect=ArtifactAccessError("unavailable"),
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "schedule_report_viewed",
    )
    def test_access_failure_after_audit_still_404(self, mock_audit, _access, _stream):
        with self.assertRaises(WorkspaceReportNotFound):
            self.service.get_preview(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id=self.report.id,
                user=self.user,
            )
        mock_audit.assert_called_once()

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "ArtifactAccessService.generate_preview_url",
        return_value="https://cdn.example/inline?sig=sec",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "schedule_report_viewed",
    )
    def test_artifact_id_selects_secondary(self, mock_audit, mock_access):
        primary = DiagnosticReportArtifact.objects.filter(
            report=self.report, is_primary=True
        ).first()
        secondary = DiagnosticReportArtifact.objects.create(
            report=self.report,
            artifact_type="IMAGE",
            is_primary=False,
            is_active=True,
            file=pdf(b"%PDF-fake-image"),
            original_filename="scan.png",
            download_filename="scan.png",
            content_type="image/png",
        )
        result = self.service.get_preview(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            report_id=self.report.id,
            user=self.user,
            artifact_id=str(secondary.id),
        )
        self.assertTrue(result.supported)
        self.assertEqual(result.artifact_id, str(secondary.id))
        self.assertNotEqual(result.artifact_id, str(primary.id))
        self.assertEqual(mock_audit.call_args.kwargs["artifact_id"], str(secondary.id))
        mock_access.assert_called_once()

    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "ArtifactAccessService.generate_preview_url",
    )
    @patch(
        "doctor_report_workspace.services.workspace.workspace_report_preview_service."
        "schedule_report_viewed",
    )
    def test_artifact_id_from_other_report_404(self, mock_audit, mock_access):
        line2, *_ = create_order_line(doctor=self.doctor, clinic=self.clinic)
        other = create_ready_report(line=line2)
        foreign = DiagnosticReportArtifact.objects.filter(report=other).first()
        with self.assertRaises(WorkspaceReportNotFound):
            self.service.get_preview(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id=self.report.id,
                user=self.user,
                artifact_id=str(foreign.id),
            )
        mock_access.assert_not_called()
        mock_audit.assert_not_called()

    def test_invalid_artifact_id(self):
        with self.assertRaises(WorkspaceReportPreviewValidationError):
            self.service.get_preview(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                report_id=self.report.id,
                user=self.user,
                artifact_id="not-a-uuid",
            )
