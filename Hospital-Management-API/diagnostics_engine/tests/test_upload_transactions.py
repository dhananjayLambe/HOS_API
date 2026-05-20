"""Upload transaction and storage rollback tests (minimal DB / mocked I/O)."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase

from diagnostics_engine.domain.reports import upload_rules
from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from diagnostics_engine.services.reports import ArtifactUploadService


def _pdf(content: bytes = b"%PDF-1.4 test") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


class UploadChecksumTests(SimpleTestCase):
    def test_checksum_rewinds_file_pointer(self):
        f = _pdf(b"pointer-test-content")
        upload_rules.compute_file_checksum(f)
        self.assertEqual(f.read(), b"pointer-test-content")


class UploadTransactionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from diagnostics_engine.tests.test_order_creation_service import _lab_org_and_branch
        from diagnostics_engine.tests.test_report_query_service import _order_and_line

        cls.order, cls.line = _order_and_line(service_name="UploadTx")
        _org, branch = _lab_org_and_branch()
        cls.order.branch = branch
        cls.order.save(update_fields=["branch"])
        cls.report = DiagnosticTestReport.objects.create(
            order_test_line=cls.line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )

    def test_duplicate_in_batch_rolls_back_all_artifacts(self):
        content = b"same-batch-content-unique"
        with self.assertRaises(ValidationError):
            ArtifactUploadService.upload_report_artifacts(
                report=self.report,
                uploaded_files=[_pdf(content), _pdf(content)],
                primary_file_index=0,
            )
        self.assertEqual(self.report.artifacts.count(), 0)
        self.assertEqual(self.report.status, ReportLifecycleStatus.PENDING)

    @patch("diagnostics_engine.services.reports.artifact_upload_service.default_storage.delete")
    @patch("diagnostics_engine.services.reports.artifact_upload_service.default_storage.exists")
    @patch.object(ArtifactUploadService, "_create_artifact")
    @patch.object(ArtifactUploadService, "_assign_primary_artifact")
    @patch.object(ArtifactUploadService, "_transition_report_on_upload")
    def test_storage_cleanup_on_mid_batch_failure(
        self,
        mock_transition,
        mock_assign,
        mock_create,
        mock_exists,
        mock_delete,
    ):
        mock_exists.return_value = True
        path1 = f"reports/test/{uuid.uuid4()}.pdf"
        create_calls = {"n": 0}

        def side_effect(**kwargs):
            create_calls["n"] += 1
            if create_calls["n"] == 1:
                artifact = MagicMock()
                artifact.file = MagicMock()
                artifact.file.name = path1
                artifact.pk = uuid.uuid4()
                return artifact
            raise ValidationError("simulated db failure")

        mock_create.side_effect = side_effect

        with self.assertRaises(ValidationError):
            ArtifactUploadService.upload_report_artifacts(
                report=self.report,
                uploaded_files=[_pdf(b"a"), _pdf(b"b")],
                primary_file_index=0,
            )

        mock_delete.assert_called()
        self.assertEqual(DiagnosticReportArtifact.objects.filter(report=self.report).count(), 0)
        mock_transition.assert_not_called()
