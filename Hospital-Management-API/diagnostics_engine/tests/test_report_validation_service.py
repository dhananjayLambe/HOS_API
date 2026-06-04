"""Tests for ReportValidationService."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport, ReportArtifactType
from diagnostics_engine.services.reports import (
    ArtifactUploadService,
    ReportDeliveryService,
    ReportValidationService,
    ReportWorkflowService,
)
from labs.choices.tracking import DeliveryStatus

from diagnostics_engine.tests.test_artifact_upload_service import _minimal_order_with_line

User = get_user_model()


def _pdf(content: bytes = b"%PDF-1.4 test") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


def _report_on_line(line, **kwargs):
    defaults = {
        "order_test_line": line,
        "storage_mode": ReportStorageMode.FILE,
        "status": ReportLifecycleStatus.PENDING,
    }
    defaults.update(kwargs)
    return DiagnosticTestReport.objects.create(**defaults)


class ReportValidationServiceTests(TestCase):
    def test_editable_active_report_passes(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.IN_PROGRESS)
        ReportValidationService.validate_report_editable(report)

    def test_deleted_report_rejected(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line)
        report.deleted_at = report.created_at
        report.save(update_fields=["deleted_at"])
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_report_active(report)

    def test_superseded_report_rejected(self):
        _, line = _minimal_order_with_line()
        old = _report_on_line(line, status=ReportLifecycleStatus.DELIVERED, revision_number=1)
        new = _report_on_line(
            line,
            revision_number=2,
            supersedes=old,
            status=ReportLifecycleStatus.PENDING,
        )
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_report_editable(old)
        ReportValidationService.validate_report_editable(new)

    def test_locked_delivered_rejected_for_upload(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(
            line,
            status=ReportLifecycleStatus.DELIVERED,
            is_editable=False,
        )
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_report_ready_for_upload(report)

    def test_delivered_passes_correction_validation(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(
            line,
            status=ReportLifecycleStatus.DELIVERED,
            is_editable=False,
        )
        ReportValidationService.validate_report_can_be_corrected(report)

    def test_rejected_not_correctable(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.REJECTED)
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_report_can_be_corrected(report)

    def test_missing_primary_rejected(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.READY)
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_primary_artifact_exists(report)

    def test_inactive_primary_rejected_for_existence(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.IN_PROGRESS)
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.PDF,
            is_primary=True,
            is_active=False,
            file=_pdf(),
        )
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_primary_artifact_exists(report)

    def test_duplicate_primary_integrity_rejected(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line)
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.PDF,
            is_primary=True,
            is_active=True,
            file=_pdf(b"a"),
        )
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.CSV,
            is_primary=True,
            is_active=True,
            file=_pdf(b"b"),
        )
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_primary_artifact_integrity(report)

    def test_zero_primaries_passes_integrity(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line)
        ReportValidationService.validate_primary_artifact_integrity(report)

    def test_ready_with_primary_passes_delivery(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(report)
        ReportValidationService.validate_report_ready_for_delivery(report)

    def test_delivered_locked_report_passes_reupload_validation(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(report)
        ReportWorkflowService.mark_delivered(report)
        report.refresh_from_db()
        self.assertFalse(report.is_editable)
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_report_ready_for_upload(report)
        ReportValidationService.validate_report_ready_for_reupload(report)

    def test_pending_rejected_for_delivery(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_report_ready_for_delivery(report)

    def test_delivery_rejected_when_active_artifacts_have_no_primary(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.READY)
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.PDF,
            is_primary=False,
            is_active=True,
            file=_pdf(b"non-primary"),
        )
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_report_ready_for_delivery(report)

    def test_delivery_rejected_when_multiple_active_primaries_exist(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.READY)
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.PDF,
            is_primary=True,
            is_active=True,
            file=_pdf(b"a"),
        )
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.CSV,
            is_primary=True,
            is_active=True,
            file=_pdf(b"b"),
        )
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_report_ready_for_delivery(report)

    def test_empty_primary_file_rejected(self):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.READY)
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.PDF,
            is_primary=True,
            is_active=True,
            file="",
        )
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_primary_artifact_exists(report)

    def test_invalid_phone_rejected(self):
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_delivery_phone("123")

    def test_generation_pending_to_in_progress_valid(self):
        ReportValidationService.validate_status_transition(
            ReportLifecycleStatus.PENDING,
            ReportLifecycleStatus.IN_PROGRESS,
        )

    def test_generation_pending_to_ready_invalid(self):
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_status_transition(
                ReportLifecycleStatus.PENDING,
                ReportLifecycleStatus.READY,
            )

    def test_generation_ready_to_delivered_valid(self):
        ReportValidationService.validate_status_transition(
            ReportLifecycleStatus.READY,
            ReportLifecycleStatus.DELIVERED,
        )

    def test_generation_delivered_to_in_progress_invalid(self):
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_status_transition(
                ReportLifecycleStatus.DELIVERED,
                ReportLifecycleStatus.IN_PROGRESS,
            )

    def test_delivery_pending_to_sent_valid(self):
        ReportValidationService.validate_delivery_status_transition(
            DeliveryStatus.PENDING,
            DeliveryStatus.SENT,
        )

    def test_delivery_delivered_to_failed_invalid(self):
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_delivery_status_transition(
                DeliveryStatus.DELIVERED,
                DeliveryStatus.FAILED,
            )

    def test_superseded_cannot_transition_lifecycle(self):
        _, line = _minimal_order_with_line()
        old = _report_on_line(line, status=ReportLifecycleStatus.IN_PROGRESS, revision_number=1)
        _report_on_line(
            line,
            revision_number=2,
            supersedes=old,
            status=ReportLifecycleStatus.PENDING,
        )
        with self.assertRaises(ValidationError):
            ReportValidationService.validate_status_transition(
                old.status,
                ReportLifecycleStatus.READY,
                report=old,
            )

    @patch.object(ReportValidationService, "validate_report_ready_for_upload")
    def test_upload_invokes_validation(self, mock_validate):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.IN_PROGRESS)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        mock_validate.assert_called()

    @patch.object(ReportValidationService, "validate_report_ready_for_delivery")
    def test_delivery_prepare_invokes_validation(self, mock_validate):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(report)
        ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        mock_validate.assert_called()

    @patch.object(ReportValidationService, "validate_report_ready_for_ready_transition")
    def test_mark_ready_invokes_validation(self, mock_validate):
        _, line = _minimal_order_with_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.IN_PROGRESS)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(report)
        mock_validate.assert_called()
