"""Tests for ReportDeliveryService."""

from __future__ import annotations

import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from clinic.models import Clinic
from consultations_core.models.consultation import Consultation
from consultations_core.services.encounter_service import EncounterService
from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderTestLine,
    DiagnosticServiceMaster,
)
from diagnostics_engine.models.choices import (
    OrderLineType,
    OrderStatus,
    OrderTestLineStatus,
    ReportLifecycleStatus,
    ReportStorageMode,
)
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.services.reports import (
    ArtifactUploadService,
    ReportDeliveryService,
    ReportWorkflowService,
)
from doctor.models import doctor as DoctorProfile
from labs.choices.tracking import DeliveryStatus
from labs.models.lab_tracking import LabReportDeliveryLog
from patient_account.models import PatientAccount, PatientProfile

from diagnostics_engine.tests.test_artifact_upload_service import _minimal_order_with_line

User = get_user_model()

DOWNLOAD_BASE = "https://test.example/report-download"


def _pdf(content: bytes = b"%PDF-1.4 test") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


def _ready_report_with_primary(*, user=None):
    _, line = _minimal_order_with_line()
    report = DiagnosticTestReport.objects.create(
        order_test_line=line,
        storage_mode=ReportStorageMode.FILE,
        status=ReportLifecycleStatus.PENDING,
    )
    ArtifactUploadService.upload_report_artifacts(
        report=report,
        uploaded_files=[_pdf()],
        primary_file_index=0,
        uploaded_by=user,
    )
    ReportWorkflowService.mark_ready(report, user=user)
    report.refresh_from_db()
    return report


@override_settings(REPORT_PUBLIC_DOWNLOAD_BASE_URL=DOWNLOAD_BASE)
class ReportDeliveryServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username=f"lab_{uuid.uuid4().hex[:8]}",
            password="pass",
        )

    def test_prepare_report_delivery_succeeds_for_ready_report(self):
        report = _ready_report_with_primary(user=self.user)
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="+91 98765-43210",
            initiated_by=self.user,
        )
        self.assertEqual(log.delivery_status, DeliveryStatus.PENDING)
        self.assertEqual(log.recipient, "+919876543210")
        self.assertIn("artifact_id", log.metadata)
        self.assertTrue(log.metadata["download_url"].startswith(DOWNLOAD_BASE))
        report.refresh_from_db()
        self.assertEqual(report.delivery_status, DeliveryStatus.PENDING)

    def test_prepare_rejects_pending_generation_status(self):
        _, line = _minimal_order_with_line()
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )
        with self.assertRaises(ValidationError):
            ReportDeliveryService.prepare_report_delivery(
                report=report,
                recipient_phone="9876543210",
            )

    def test_prepare_rejects_missing_primary_artifact(self):
        report = _ready_report_with_primary()
        report.artifacts.update(is_primary=False)
        with self.assertRaises(ValidationError):
            ReportDeliveryService.prepare_report_delivery(
                report=report,
                recipient_phone="9876543210",
            )

    def test_mark_delivery_sent(self):
        report = _ready_report_with_primary()
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_sent(
            delivery_log=log,
            external_message_id="msg-123",
        )
        log.refresh_from_db()
        report.refresh_from_db()
        self.assertEqual(log.delivery_status, DeliveryStatus.SENT)
        self.assertIsNotNone(log.sent_at)
        self.assertEqual(log.external_message_id, "msg-123")
        self.assertEqual(report.delivery_status, DeliveryStatus.SENT)

    def test_mark_delivery_delivered_updates_generation_when_ready(self):
        report = _ready_report_with_primary()
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_sent(delivery_log=log)
        ReportDeliveryService.mark_delivery_delivered(delivery_log=log, user=self.user)
        report.refresh_from_db()
        log.refresh_from_db()
        self.assertEqual(log.delivery_status, DeliveryStatus.DELIVERED)
        self.assertEqual(report.delivery_status, DeliveryStatus.DELIVERED)
        self.assertEqual(report.status, ReportLifecycleStatus.DELIVERED)
        self.assertFalse(report.is_editable)

    def test_mark_delivery_failed_preserves_reason(self):
        report = _ready_report_with_primary()
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_failed(delivery_log=log, reason="Provider timeout")
        log.refresh_from_db()
        report.refresh_from_db()
        self.assertEqual(log.delivery_status, DeliveryStatus.FAILED)
        self.assertEqual(log.failure_reason, "Provider timeout")
        self.assertEqual(report.delivery_status, DeliveryStatus.FAILED)

    def test_retry_delivery_creates_new_row(self):
        report = _ready_report_with_primary()
        failed = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_failed(delivery_log=failed, reason="fail")
        before = LabReportDeliveryLog.objects.filter(diagnostic_test_report=report).count()
        retry = ReportDeliveryService.retry_delivery(delivery_log=failed, initiated_by=self.user)
        after = LabReportDeliveryLog.objects.filter(diagnostic_test_report=report).count()
        self.assertEqual(after, before + 1)
        self.assertNotEqual(retry.id, failed.id)
        self.assertEqual(retry.delivery_status, DeliveryStatus.PENDING)
        self.assertEqual(retry.retry_count, 1)

    def test_parent_failed_log_unchanged_after_retry(self):
        report = _ready_report_with_primary()
        failed = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_failed(delivery_log=failed, reason="original")
        parent_id = failed.id
        parent_reason = failed.failure_reason
        parent_status = failed.delivery_status
        ReportDeliveryService.retry_delivery(delivery_log=failed)
        failed.refresh_from_db()
        self.assertEqual(failed.id, parent_id)
        self.assertEqual(failed.failure_reason, parent_reason)
        self.assertEqual(failed.delivery_status, parent_status)

    def test_delivered_dominates_failed_retry_on_report_mirror(self):
        report = _ready_report_with_primary()
        ReportDeliveryService.deliver_via_channel(
            report=report,
            channel="WHATSAPP",
            recipient="9876543210",
            user=self.user,
        )
        report.refresh_from_db()
        self.assertEqual(report.delivery_status, DeliveryStatus.DELIVERED)

        retry_log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_failed(
            delivery_log=retry_log,
            reason="Second attempt failed",
        )
        report.refresh_from_db()
        self.assertEqual(report.delivery_status, DeliveryStatus.DELIVERED)

    def test_retry_rejected_for_delivered_pending_or_viewed_parent(self):
        report = _ready_report_with_primary()
        pending = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        with self.assertRaises(ValidationError):
            ReportDeliveryService.retry_delivery(delivery_log=pending)

        delivered_log = ReportDeliveryService.deliver_via_channel(
            report=report,
            channel="WHATSAPP",
            recipient="9876543210",
        )
        with self.assertRaises(ValidationError):
            ReportDeliveryService.retry_delivery(delivery_log=delivered_log)

        viewed_log = ReportDeliveryService.record_delivery_attempt(
            report=report,
            channel="WHATSAPP",
            recipient="9876543210",
            delivery_status=DeliveryStatus.VIEWED,
        )
        with self.assertRaises(ValidationError):
            ReportDeliveryService.retry_delivery(delivery_log=viewed_log)

    def test_placeholder_download_url_never_contains_s3(self):
        report = _ready_report_with_primary()
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        url = log.metadata["download_url"]
        self.assertTrue(url.startswith(DOWNLOAD_BASE))
        self.assertNotIn("amazonaws", url.lower())
        self.assertNotIn("s3://", url.lower())

    def test_audit_fields_on_sent(self):
        report = _ready_report_with_primary(user=self.user)
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
            initiated_by=self.user,
        )
        ReportDeliveryService.mark_delivery_sent(
            delivery_log=log,
            external_message_id="wa-ext-99",
        )
        log.refresh_from_db()
        self.assertEqual(log.created_by_id, self.user.id)
        self.assertIn("artifact_id", log.metadata)
        self.assertEqual(log.external_message_id, "wa-ext-99")

    def test_retry_chain_metadata_links_parent(self):
        report = _ready_report_with_primary()
        failed = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_failed(delivery_log=failed, reason="x")
        child = ReportDeliveryService.retry_delivery(delivery_log=failed)
        self.assertEqual(child.metadata["retry_of_log_id"], str(failed.id))

    def test_soft_deleted_log_ignored_in_sync(self):
        report = _ready_report_with_primary()
        good = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_sent(delivery_log=good)
        ReportDeliveryService.mark_delivery_delivered(delivery_log=good)

        stale = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_failed(delivery_log=stale, reason="stale")
        stale.is_deleted = True
        stale.save(update_fields=["is_deleted", "updated_at"])

        ReportDeliveryService.sync_report_delivery_status(report=report)
        report.refresh_from_db()
        self.assertEqual(report.delivery_status, DeliveryStatus.DELIVERED)

    def test_locked_report_allows_delivery(self):
        report = _ready_report_with_primary()
        report.is_editable = False
        report.save(update_fields=["is_editable", "updated_at"])
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        self.assertEqual(log.delivery_status, DeliveryStatus.PENDING)

    def test_failed_when_never_delivered(self):
        report = _ready_report_with_primary()
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_failed(delivery_log=log, reason="only fail")
        report.refresh_from_db()
        self.assertEqual(report.delivery_status, DeliveryStatus.FAILED)

    def test_viewed_aggregation_dominates_delivered(self):
        report = _ready_report_with_primary()
        ReportDeliveryService.deliver_via_channel(
            report=report,
            channel="WHATSAPP",
            recipient="9876543210",
        )
        report.refresh_from_db()
        self.assertEqual(report.delivery_status, DeliveryStatus.DELIVERED)

        ReportDeliveryService.record_delivery_attempt(
            report=report,
            channel="WHATSAPP",
            recipient="9876543210",
            delivery_status=DeliveryStatus.VIEWED,
        )
        report.refresh_from_db()
        self.assertEqual(report.delivery_status, DeliveryStatus.VIEWED)

    def test_multiple_failed_retries_after_success_stay_delivered(self):
        report = _ready_report_with_primary()
        ReportDeliveryService.deliver_via_channel(
            report=report,
            channel="WHATSAPP",
            recipient="9876543210",
        )
        for attempt in range(3):
            log = ReportDeliveryService.prepare_report_delivery(
                report=report,
                recipient_phone="9876543210",
            )
            ReportDeliveryService.mark_delivery_failed(
                delivery_log=log,
                reason=f"retry fail {attempt}",
            )
        report.refresh_from_db()
        self.assertEqual(report.delivery_status, DeliveryStatus.DELIVERED)

    def test_prepare_sent_delivered_uses_same_log(self):
        report = _ready_report_with_primary()
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        log_id = log.id
        ReportDeliveryService.mark_delivery_sent(delivery_log=log)
        log.refresh_from_db()
        self.assertEqual(log.id, log_id)
        ReportDeliveryService.mark_delivery_delivered(delivery_log=log)
        log.refresh_from_db()
        self.assertEqual(log.id, log_id)
        self.assertEqual(log.delivery_status, DeliveryStatus.DELIVERED)
        self.assertEqual(
            LabReportDeliveryLog.objects.filter(diagnostic_test_report=report).count(),
            1,
        )

    def test_deliver_via_channel_single_log(self):
        report = _ready_report_with_primary(user=self.user)
        log = ReportDeliveryService.deliver_via_channel(
            report=report,
            channel="WHATSAPP",
            recipient="9876543210",
            user=self.user,
        )
        count = LabReportDeliveryLog.objects.filter(diagnostic_test_report=report).count()
        self.assertEqual(count, 1)
        self.assertEqual(log.delivery_status, DeliveryStatus.DELIVERED)
