"""Tests for v1 diagnostic report operational APIs."""

from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from diagnostics_engine.api.serializers.reports.report_artifact import ReportArtifactSerializer
from diagnostics_engine.api.serializers.reports.upload_request import UploadArtifactRequestSerializer
from diagnostics_engine.domain.reports import get_active_report_for_line
from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from diagnostics_engine.domain.reports.report_actions import ReportAction
from diagnostics_engine.services.reports import (
    ArtifactUploadService,
    ReportDeliveryService,
    ReportWorkflowService,
)
from labs.choices.tracking import DeliveryStatus
from labs.models.lab_tracking import LabReportDeliveryLog
from labs.tests.support.workflow_factories import (
    lab_admin_client,
    lab_mode_assignment,
    other_branch,
)

User = get_user_model()


def _pdf(content: bytes = b"%PDF-1.4 test") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


class ReportAPITestCase(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, self.org = lab_admin_client()
        self.assignment, self.order = lab_mode_assignment(self.branch)
        self.line = self.order.test_lines.first()
        self.report = DiagnosticTestReport.objects.create(
            order_test_line=self.line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )

    def test_task_queue_list_envelope(self):
        url = reverse("v1-report-task-queue")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertIn("results", res.data["data"])
        self.assertIn("counts", res.data["data"])
        self.assertGreaterEqual(len(res.data["data"]["results"]), 1)

    def test_task_queue_counts_shape(self):
        url = reverse("v1-report-task-queue")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        counts = res.data["data"]["counts"]
        self.assertIn("pending_uploads", counts)
        self.assertIn("ready_delivery", counts)
        self.assertIn("delivered", counts)
        self.assertIn("failed", counts)

    def test_task_queue_invalid_workflow_returns_400(self):
        url = reverse("v1-report-task-queue")
        res = self.client.get(url, {"workflow": "not-real"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data["success"])

    def test_task_queue_pagination_with_page_size(self):
        lab_mode_assignment(self.branch)
        lab_mode_assignment(self.branch)
        url = reverse("v1-report-task-queue")
        res = self.client.get(url, {"page_size": 1})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["data"]["results"]), 1)
        self.assertIsNotNone(res.data["data"]["next"])

    def test_task_queue_counts_stable_across_pagination_pages(self):
        lab_mode_assignment(self.branch)
        lab_mode_assignment(self.branch)
        url = reverse("v1-report-task-queue")
        first = self.client.get(url, {"page_size": 1})
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        first_counts = first.data["data"]["counts"]
        next_url = first.data["data"]["next"]
        self.assertIsNotNone(next_url)

        second = self.client.get(next_url)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        second_counts = second.data["data"]["counts"]
        self.assertEqual(first_counts, second_counts)

    def test_task_queue_includes_action_targets(self):
        url = reverse("v1-report-task-queue")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        card = next(
            r
            for r in res.data["data"]["results"]
            if str(r["task_id"]) == str(self.assignment.id)
        )
        targets = card["available_action_targets"]
        self.assertIn("upload_report_id", targets)
        self.assertIn("mark_ready_report_id", targets)
        self.assertIn("send_whatsapp_report_id", targets)
        self.assertIn("retry_delivery_log_id", targets)
        self.assertEqual(str(targets["upload_report_id"]), str(self.report.id))
        self.assertIsNone(targets["mark_ready_report_id"])
        self.assertIsNone(targets["send_whatsapp_report_id"])
        self.assertIsNone(targets["retry_delivery_log_id"])

    def test_task_queue_search_by_order_number(self):
        other_assignment, other_order = lab_mode_assignment(self.branch)
        other_order.order_number = "ORD-QUEUE-FINDME"
        other_order.save(update_fields=["order_number"])
        self.order.order_number = "ORD-QUEUE-OTHER99"
        self.order.save(update_fields=["order_number"])

        url = reverse("v1-report-task-queue")
        res = self.client.get(url, {"q": "FINDME"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        task_ids = {str(r["task_id"]) for r in res.data["data"]["results"]}
        self.assertEqual(task_ids, {str(other_assignment.id)})

    def test_task_queue_search_by_patient_name(self):
        profile = self.order.patient_profile
        profile.first_name = "QueueUnique"
        profile.last_name = "Patient"
        profile.save(update_fields=["first_name", "last_name"])
        other_assignment, other_order = lab_mode_assignment(self.branch)
        other_profile = other_order.patient_profile
        other_profile.first_name = "Other"
        other_profile.last_name = "Person"
        other_profile.save(update_fields=["first_name", "last_name"])

        url = reverse("v1-report-task-queue")
        res = self.client.get(url, {"q": "QueueUnique"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        task_ids = {str(r["task_id"]) for r in res.data["data"]["results"]}
        self.assertEqual(task_ids, {str(self.assignment.id)})

    def test_task_queue_search_by_patient_full_name(self):
        profile = self.order.patient_profile
        profile.first_name = "QueueUnique"
        profile.last_name = "Patient"
        profile.save(update_fields=["first_name", "last_name"])
        other_assignment, other_order = lab_mode_assignment(self.branch)
        other_profile = other_order.patient_profile
        other_profile.first_name = "Other"
        other_profile.last_name = "Person"
        other_profile.save(update_fields=["first_name", "last_name"])

        url = reverse("v1-report-task-queue")
        res = self.client.get(url, {"q": "QueueUnique Patient"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        task_ids = {str(r["task_id"]) for r in res.data["data"]["results"]}
        self.assertEqual(task_ids, {str(self.assignment.id)})

    def test_task_queue_search_by_service_name(self):
        line = self.order.test_lines.select_related("service").first()
        line.service.name = "QueueUniqueSerumPanel"
        line.service.save(update_fields=["name"])
        other_assignment, other_order = lab_mode_assignment(self.branch)
        other_line = other_order.test_lines.select_related("service").first()
        other_line.service.name = "OtherPanelOnly"
        other_line.service.save(update_fields=["name"])

        url = reverse("v1-report-task-queue")
        res = self.client.get(url, {"q": "UniqueSerum"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        task_ids = {str(r["task_id"]) for r in res.data["data"]["results"]}
        self.assertEqual(task_ids, {str(self.assignment.id)})

    def test_task_queue_search_branch_isolation(self):
        branch_b = other_branch(self.org, branch_name="Report Queue Search Branch B")
        assignment_b, order_b = lab_mode_assignment(branch_b)
        line_b = order_b.test_lines.select_related("service").first()
        line_b.service.name = "CBC"
        line_b.service.save(update_fields=["name"])
        line_a = self.order.test_lines.select_related("service").first()
        line_a.service.name = "CBC"
        line_a.service.save(update_fields=["name"])

        url = reverse("v1-report-task-queue")
        res = self.client.get(url, {"q": "cbc"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        task_ids = {str(r["task_id"]) for r in res.data["data"]["results"]}
        self.assertIn(str(self.assignment.id), task_ids)
        self.assertNotIn(str(assignment_b.id), task_ids)

    def test_task_queue_action_targets_after_upload(self):
        ArtifactUploadService.upload_report_artifacts(
            report=self.report,
            uploaded_files=[_pdf(b"queue-targets")],
            primary_file_index=0,
        )
        url = reverse("v1-report-task-queue")
        res = self.client.get(url)
        card = next(
            r
            for r in res.data["data"]["results"]
            if str(r["task_id"]) == str(self.assignment.id)
        )
        targets = card["available_action_targets"]
        self.assertEqual(str(targets["mark_ready_report_id"]), str(self.report.id))
        self.assertIsNone(targets["upload_report_id"])

    def test_task_queue_operational_status_after_upload(self):
        url = reverse("v1-report-task-queue")
        before = self.client.get(url)
        card = next(
            r
            for r in before.data["data"]["results"]
            if str(r["task_id"]) == str(self.assignment.id)
        )
        self.assertEqual(card["operational_status"], "PENDING_UPLOAD")

        ArtifactUploadService.upload_report_artifacts(
            report=self.report,
            uploaded_files=[_pdf(b"queue-status")],
            primary_file_index=0,
        )

        after = self.client.get(url)
        card = next(
            r
            for r in after.data["data"]["results"]
            if str(r["task_id"]) == str(self.assignment.id)
        )
        self.assertEqual(card["operational_status"], "UPLOADED")

    def test_task_context_returns_active_reports(self):
        url = reverse("v1-report-task-context", kwargs={"task_id": self.assignment.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertIn("request_id", res.data)
        data = res.data["data"]
        self.assertEqual(str(data["task_id"]), str(self.assignment.id))
        self.assertEqual(len(data["active_reports"]), 1)
        self.assertEqual(str(data["active_reports"][0]["report_id"]), str(self.report.id))
        self.assertIsNotNone(data["upload_target"])
        self.assertEqual(
            str(data["upload_target"]["report_id"]),
            str(self.report.id),
        )

    def test_task_context_provisions_reports_when_missing(self):
        self.report.delete()
        url = reverse("v1-report-task-context", kwargs={"task_id": self.assignment.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data["data"]
        self.assertEqual(len(data["active_reports"]), 1)
        self.assertIsNotNone(data["upload_target"])
        report_id = data["upload_target"]["report_id"]
        self.assertEqual(
            str(data["active_reports"][0]["report_id"]),
            str(report_id),
        )
        self.assertTrue(
            DiagnosticTestReport.objects.filter(pk=report_id).exists(),
        )

    def test_upload_success_envelope(self):
        url = reverse("v1-report-artifact-upload", kwargs={"report_id": self.report.id})
        res = self.client.post(
            url,
            {"files": _pdf(b"upload-a"), "primary_file_index": "0"},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["success"])
        self.assertEqual(res.data["data"]["status"], ReportLifecycleStatus.IN_PROGRESS)
        self.assertEqual(len(res.data["data"]["artifacts"]), 1)

    def test_upload_duplicate_rejected(self):
        url = reverse("v1-report-artifact-upload", kwargs={"report_id": self.report.id})
        content = b"dup-content"
        self.client.post(url, {"files": _pdf(content), "primary_file_index": "0"}, format="multipart")
        res = self.client.post(url, {"files": _pdf(content)}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data["success"])
        self.assertEqual(res.data["error"]["code"], "DUPLICATE_ARTIFACT")

    def test_upload_oversized_rejected(self):
        from django.test import override_settings

        url = reverse("v1-report-artifact-upload", kwargs={"report_id": self.report.id})
        huge = SimpleUploadedFile("big.pdf", b"x" * (3 * 1024 * 1024), content_type="application/pdf")
        with override_settings(MAX_REPORT_UPLOAD_SIZE_MB=1):
            res = self.client.post(url, {"files": huge}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_unauthorized(self):
        anon = APIClient()
        url = reverse("v1-report-artifact-upload", kwargs={"report_id": self.report.id})
        res = anon.post(url, {"files": _pdf()}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_superseded_report_rejected(self):
        new_report = DiagnosticTestReport.objects.create(
            order_test_line=self.line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
            revision_number=2,
            supersedes=self.report,
        )
        url = reverse("v1-report-artifact-upload", kwargs={"report_id": self.report.id})
        res = self.client.post(url, {"files": _pdf(b"old-head")}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotEqual(new_report.id, self.report.id)

    def test_detail_returns_artifacts(self):
        ArtifactUploadService.upload_report_artifacts(
            report=self.report,
            uploaded_files=[_pdf(b"detail")],
            primary_file_index=0,
        )
        url = reverse("v1-report-detail", kwargs={"report_id": self.report.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertEqual(len(res.data["data"]["artifacts"]), 1)
        self.assertIn("available_actions", res.data["data"])

    def test_detail_excludes_inactive_artifacts(self):
        ArtifactUploadService.upload_report_artifacts(
            report=self.report,
            uploaded_files=[_pdf(b"active")],
            primary_file_index=0,
        )
        old = self.report.artifacts.filter(is_active=True).first()
        DiagnosticReportArtifact.objects.create(
            report=self.report,
            artifact_type=old.artifact_type,
            is_active=False,
            is_primary=False,
            version=99,
            original_filename="inactive.pdf",
            file_extension="pdf",
            checksum="inactive-checksum-unique",
        )
        url = reverse("v1-report-detail", kwargs={"report_id": self.report.id})
        res = self.client.get(url)
        filenames = [a["original_filename"] for a in res.data["data"]["artifacts"]]
        self.assertNotIn("inactive.pdf", filenames)

    def test_detail_superseded_returns_error(self):
        DiagnosticTestReport.objects.create(
            order_test_line=self.line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
            revision_number=2,
            supersedes=self.report,
        )
        url = reverse("v1-report-detail", kwargs={"report_id": self.report.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data["error"]["code"], "REPORT_SUPERSEDED")

    def test_download_returns_artifact_metadata(self):
        url = reverse("v1-report-artifact-upload", kwargs={"report_id": self.report.id})
        self.client.post(url, {"files": [_pdf()]}, format="multipart")
        self.report.refresh_from_db()
        ReportWorkflowService.mark_ready(self.report, user=self.lab_user.user)

        dl = reverse("v1-report-download", kwargs={"report_id": self.report.id})
        res = self.client.get(dl)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data["data"]
        self.assertIn("artifact_id", data)
        self.assertIn("filename", data)
        self.assertIn("expires_in", data)

    def test_branch_access_denied(self):
        _other_client, _other_lu, other_br, _ = lab_admin_client(branch_name="Other Lab Branch 2")
        _assignment2, order2 = lab_mode_assignment(other_br)
        line2 = order2.test_lines.first()
        report2 = DiagnosticTestReport.objects.create(
            order_test_line=line2,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )
        url = reverse("v1-report-detail", kwargs={"report_id": report2.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data["error"]["code"], "BRANCH_ACCESS_DENIED")

    def test_artifact_serializer_hides_checksum(self):
        ser = ReportArtifactSerializer()
        self.assertNotIn("checksum", ser.fields)
        self.assertNotIn("storage_path", ser.fields)

    def test_upload_request_shape_only(self):
        bad = UploadArtifactRequestSerializer(
            data={"files": [], "primary_file_index": 0},
        )
        self.assertFalse(bad.is_valid())

    def test_assignment_not_found(self):
        url = reverse("v1-report-task-context", kwargs={"task_id": uuid.uuid4()})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data["error"]["code"], "ASSIGNMENT_NOT_FOUND")

    def _upload_primary(self, report=None):
        report = report or self.report
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"primary-content")],
            uploaded_by=self.lab_user.user,
            primary_file_index=0,
        )
        report.refresh_from_db()
        return report

    def test_mark_ready_success(self):
        self._upload_primary()
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        res = self.client.post(url, {"notes": "ready for delivery"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        data = res.data["data"]
        self.assertEqual(data["status"], ReportLifecycleStatus.READY)
        self.assertIn(ReportAction.SEND_WHATSAPP, data["available_actions"])

    def test_mark_ready_rejects_without_artifacts(self):
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"]["code"], "REPORT_NOT_READY")

    def test_mark_ready_rejects_pending_status(self):
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mark_ready_rejects_already_ready(self):
        self._upload_primary()
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        self.client.post(url, {}, format="json")
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mark_ready_preserves_ready_at(self):
        from django.utils import timezone

        self._upload_primary()
        self.report.ready_at = timezone.now() - timezone.timedelta(days=1)
        self.report.status = ReportLifecycleStatus.IN_PROGRESS
        self.report.save(update_fields=["ready_at", "status", "updated_at"])
        original_ready_at = self.report.ready_at
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        self.client.post(url, {}, format="json")
        self.report.refresh_from_db()
        self.assertEqual(self.report.ready_at, original_ready_at)

    def test_mark_ready_rejects_superseded(self):
        self._upload_primary()
        DiagnosticTestReport.objects.create(
            order_test_line=self.line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
            revision_number=2,
            supersedes=self.report,
        )
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data["error"]["code"], "REPORT_SUPERSEDED")

    def test_mark_ready_rejects_delivered_locked(self):
        self._upload_primary()
        ReportWorkflowService.mark_ready(self.report)
        ReportWorkflowService.mark_delivered(self.report)
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"]["code"], "REPORT_LOCKED")

    def test_mark_ready_branch_denied(self):
        self._upload_primary()
        _other_client, _lu, other_br, _ = lab_admin_client(branch_name="Mark Ready Other Branch")
        _a2, order2 = lab_mode_assignment(other_br)
        report2 = DiagnosticTestReport.objects.create(
            order_test_line=order2.test_lines.first(),
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.IN_PROGRESS,
        )
        ArtifactUploadService.upload_report_artifacts(
            report=report2,
            uploaded_files=[_pdf(b"x")],
            primary_file_index=0,
        )
        url = reverse("v1-report-mark-ready", kwargs={"report_id": report2.id})
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(REPORT_DELIVERY_ASYNC=False)
    def test_send_whatsapp_success(self):
        self._upload_primary()
        ReportWorkflowService.mark_ready(self.report)
        url = reverse("v1-report-send-whatsapp", kwargs={"report_id": self.report.id})
        res = self.client.post(
            url,
            {"recipient_phone": "9876543210", "channel": "WHATSAPP"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data["data"]
        self.assertEqual(data["delivery_status"], DeliveryStatus.DELIVERED)
        self.assertIn("delivery_log_id", data)
        self.assertIn("available_actions", data)
        body = str(res.data)
        self.assertNotIn("amazonaws.com", body.lower())
        self.assertNotIn(".s3.", body.lower())

    def test_send_whatsapp_rejects_pending_report(self):
        url = reverse("v1-report-send-whatsapp", kwargs={"report_id": self.report.id})
        res = self.client.post(
            url,
            {"recipient_phone": "9876543210"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retry_delivery_success(self):
        self._upload_primary()
        ReportWorkflowService.mark_ready(self.report)
        log = ReportDeliveryService.prepare_report_delivery(
            report=self.report,
            recipient_phone="9876543210",
        )
        ReportDeliveryService.mark_delivery_failed(delivery_log=log, reason="fail")
        url = reverse("v1-delivery-log-retry", kwargs={"log_id": log.id})
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data["data"]
        self.assertEqual(data["parent_delivery_log_id"], str(log.id))
        self.assertEqual(data["status"], DeliveryStatus.PENDING)
        new_log = LabReportDeliveryLog.objects.get(pk=data["new_delivery_log_id"])
        self.assertEqual(new_log.metadata.get("retry_of_log_id"), str(log.id))
        log.refresh_from_db()
        self.assertEqual(log.delivery_status, DeliveryStatus.FAILED)
        self.assertEqual(log.failure_reason, "fail")

    def test_retry_delivery_rejects_delivered_parent(self):
        self._upload_primary()
        ReportWorkflowService.mark_ready(self.report)
        log = ReportDeliveryService.deliver_via_channel(
            report=self.report,
            channel="WHATSAPP",
            recipient="9876543210",
        )
        url = reverse("v1-delivery-log-retry", kwargs={"log_id": log.id})
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_operational_history_excludes_inactive_artifacts(self):
        self._upload_primary()
        old = self.report.artifacts.filter(is_active=True).first()
        DiagnosticReportArtifact.objects.create(
            report=self.report,
            artifact_type=old.artifact_type,
            is_active=False,
            is_primary=False,
            version=99,
            original_filename="inactive.pdf",
            file_extension="pdf",
            checksum="hist-inactive-checksum",
        )
        url = reverse("v1-report-history", kwargs={"report_id": self.report.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        filenames = [a["original_filename"] for a in res.data["data"]["artifacts"]]
        self.assertNotIn("inactive.pdf", filenames)

    def test_operational_history_superseded_404(self):
        DiagnosticTestReport.objects.create(
            order_test_line=self.line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
            revision_number=2,
            supersedes=self.report,
        )
        url = reverse("v1-report-history", kwargs={"report_id": self.report.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data["error"]["code"], "REPORT_SUPERSEDED")

    def test_patient_reports_list(self):
        self._upload_primary()
        patient_id = self.order.patient_profile_id
        url = reverse("v1-patient-reports", kwargs={"patient_id": patient_id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("results", res.data["data"])
        self.assertGreaterEqual(len(res.data["data"]["results"]), 1)
        item = res.data["data"]["results"][0]
        self.assertIn("report_id", item)
        self.assertNotIn("patient_name", item)

    def test_encounter_reports_list(self):
        self._upload_primary()
        encounter_id = self.order.encounter_id
        url = reverse("v1-encounter-reports", kwargs={"encounter_id": encounter_id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(str(res.data["data"]["encounter_id"]), str(encounter_id))
        self.assertGreaterEqual(len(res.data["data"]["reports"]), 1)
