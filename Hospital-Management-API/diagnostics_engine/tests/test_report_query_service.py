"""Tests for ReportQueryService."""

from __future__ import annotations

import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from diagnostics_engine.domain.reports import get_active_report_for_line
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
from diagnostics_engine.models.reports import (
    DiagnosticReportArtifact,
    DiagnosticTestReport,
    ReportArtifactType,
)
from diagnostics_engine.services.reports import (
    ArtifactUploadService,
    ReportDeliveryService,
    ReportQueryService,
    ReportWorkflowService,
)
from labs.choices.tracking import DeliveryStatus
from labs.models.lab_tracking import LabReportDeliveryLog
from patient_account.models import PatientProfile

from diagnostics_engine.tests.test_artifact_upload_service import _minimal_order_with_line

User = get_user_model()

DOWNLOAD_BASE = "https://test.example/report-download"


def _pdf(content: bytes = b"%PDF-1.4 test") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


def _order_and_line(*, service_name: str = "CBC", patient_first: str = "Rahul"):
    order, line = _minimal_order_with_line(service_name=service_name)
    profile = order.patient_profile
    profile.first_name = patient_first
    profile.save(update_fields=["first_name"])
    return order, line


def _report_on_line(line, **kwargs):
    defaults = {
        "order_test_line": line,
        "storage_mode": ReportStorageMode.FILE,
        "status": ReportLifecycleStatus.PENDING,
    }
    defaults.update(kwargs)
    return DiagnosticTestReport.objects.create(**defaults)


@override_settings(REPORT_PUBLIC_DOWNLOAD_BASE_URL=DOWNLOAD_BASE)
class ReportQueryServiceTests(TestCase):
    def test_active_report_excludes_superseded(self):
        order, line = _order_and_line()
        old = _report_on_line(line, status=ReportLifecycleStatus.DELIVERED, revision_number=1)
        new = _report_on_line(
            line,
            status=ReportLifecycleStatus.PENDING,
            revision_number=2,
            supersedes=old,
        )
        active = ReportQueryService.get_active_report_for_line(order_test_line=line)
        self.assertEqual(active.id, new.id)
        self.assertNotEqual(active.id, old.id)

    def test_soft_deleted_excluded_include_deleted_shows_active_head(self):
        order, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.READY)
        profile = order.patient_profile
        report.deleted_at = timezone.now()
        report.save(update_fields=["deleted_at", "updated_at"])

        qs_default = ReportQueryService.get_reports_for_patient(patient_profile=profile)
        self.assertEqual(qs_default.count(), 0)

        qs_deleted = ReportQueryService.get_reports_for_patient(
            patient_profile=profile,
            include_deleted=True,
        )
        self.assertEqual(qs_deleted.count(), 1)
        self.assertEqual(qs_deleted.first().id, report.id)

    def test_patient_history_ordering_newest_first(self):
        order, line1 = _order_and_line(service_name="TestA")
        line2 = DiagnosticOrderTestLine.objects.create(
            order=order,
            order_item=line1.order_item,
            service=line1.service,
            status=OrderTestLineStatus.IN_PROGRESS,
        )
        older = _report_on_line(line1, status=ReportLifecycleStatus.READY)
        newer = _report_on_line(line2, status=ReportLifecycleStatus.READY)
        older.updated_at = timezone.now() - timezone.timedelta(days=2)
        older.save(update_fields=["updated_at"])
        newer.updated_at = timezone.now() - timezone.timedelta(days=1)
        newer.save(update_fields=["updated_at"])

        ids = list(
            ReportQueryService.get_reports_for_patient(patient_profile=order.patient_profile).values_list(
                "id",
                flat=True,
            ),
        )
        self.assertEqual(ids[0], newer.id)

    def test_encounter_reports_ordering_oldest_first(self):
        order, line1 = _order_and_line(service_name="EncA")
        encounter = order.encounter
        line2 = DiagnosticOrderTestLine.objects.create(
            order=order,
            order_item=line1.order_item,
            service=line1.service,
            status=OrderTestLineStatus.IN_PROGRESS,
        )
        older = _report_on_line(line1, status=ReportLifecycleStatus.READY)
        newer = _report_on_line(line2, status=ReportLifecycleStatus.READY)
        older.updated_at = timezone.now() - timezone.timedelta(days=2)
        older.save(update_fields=["updated_at"])
        newer.updated_at = timezone.now() - timezone.timedelta(days=1)
        newer.save(update_fields=["updated_at"])

        ids = list(
            ReportQueryService.get_reports_for_encounter(encounter=encounter).values_list(
                "id",
                flat=True,
            ),
        )
        self.assertEqual(ids[0], older.id)
        self.assertEqual(ids[-1], newer.id)

    def test_get_operational_report_history_active_head(self):
        order, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.IN_PROGRESS)
        loaded = ReportQueryService.get_operational_report_history(report_id=report.id)
        self.assertEqual(loaded.id, report.id)

    def test_encounter_history_scoped(self):
        order, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.READY)
        encounter = order.encounter
        other_order, other_line = _order_and_line(service_name="OtherTest")
        _report_on_line(other_line, status=ReportLifecycleStatus.READY)

        qs = ReportQueryService.get_reports_for_encounter(encounter=encounter)
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first().id, report.id)

    def test_task_queue_filters_pending(self):
        order, line = _order_and_line()
        pending = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        _report_on_line(
            DiagnosticOrderTestLine.objects.create(
                order=order,
                order_item=line.order_item,
                service=line.service,
                status=OrderTestLineStatus.IN_PROGRESS,
            ),
            status=ReportLifecycleStatus.READY,
        )
        qs = ReportQueryService.get_report_task_queue(statuses=["pending"])
        self.assertEqual(set(qs.values_list("id", flat=True)), {pending.id})

    def test_search_mixed_case_matches_patient_name(self):
        order, line = _order_and_line(patient_first="Rahul")
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        qs = ReportQueryService.get_report_task_queue(search="rAhUl")
        self.assertIn(report.id, list(qs.values_list("id", flat=True)))

    def test_ready_queue_requires_primary_artifact(self):
        order, line = _order_and_line()
        ready_no_file = _report_on_line(line, status=ReportLifecycleStatus.READY)
        ready_with_file = _report_on_line(
            DiagnosticOrderTestLine.objects.create(
                order=order,
                order_item=line.order_item,
                service=line.service,
                status=OrderTestLineStatus.IN_PROGRESS,
            ),
            status=ReportLifecycleStatus.PENDING,
        )
        ArtifactUploadService.upload_report_artifacts(
            report=ready_with_file,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(ready_with_file)

        qs = ReportQueryService.get_reports_ready_for_delivery()
        ids = set(qs.values_list("id", flat=True))
        self.assertIn(ready_with_file.id, ids)
        self.assertNotIn(ready_no_file.id, ids)

    def test_get_primary_artifact_returns_active_primary(self):
        _, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        primary = ReportQueryService.get_primary_artifact(report=report)
        self.assertIsNotNone(primary)
        self.assertTrue(primary.is_primary)

    def test_get_active_artifacts_excludes_inactive(self):
        _, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        active = DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.PDF,
            is_primary=True,
            is_active=True,
            file=_pdf(),
        )
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.PDF,
            is_primary=False,
            is_active=False,
            file=_pdf(b"%PDF inactive"),
        )
        artifacts = ReportQueryService.get_active_artifacts(report=report)
        self.assertEqual(len(artifacts), 1)
        self.assertEqual(artifacts[0].id, active.id)

    def test_task_queue_prefetch_limits_queries(self):
        for _ in range(3):
            order, line = _order_and_line(service_name=f"T-{uuid.uuid4().hex[:4]}")
            _report_on_line(line, status=ReportLifecycleStatus.PENDING)

        qs = ReportQueryService.get_report_task_queue(statuses=["pending"])
        with CaptureQueriesContext(connection) as ctx:
            rows = list(qs)
            for row in rows:
                _ = row.order_test_line.service.name
                _ = row.order_test_line.order.patient_profile.first_name
                _ = list(row.artifacts.all())
        self.assertEqual(len(rows), 3)
        self.assertLessEqual(len(ctx.captured_queries), 6)

    def test_delivery_failed_filter(self):
        _, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.READY)
        report.delivery_status = DeliveryStatus.FAILED
        report.save(update_fields=["delivery_status", "updated_at"])
        qs = ReportQueryService.get_report_task_queue(statuses=["delivery_failed"])
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first().id, report.id)

    def test_delivery_status_enum_value_filter(self):
        _, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.READY)
        report.delivery_status = DeliveryStatus.FAILED
        report.save(update_fields=["delivery_status", "updated_at"])
        qs = ReportQueryService.get_report_task_queue(statuses=[DeliveryStatus.FAILED])
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first().id, report.id)

    def test_revision_number_precedence(self):
        _, line = _order_and_line()
        r1 = _report_on_line(line, revision_number=1, status=ReportLifecycleStatus.DELIVERED)
        r2 = _report_on_line(
            line,
            revision_number=2,
            status=ReportLifecycleStatus.READY,
            supersedes=r1,
        )
        active = get_active_report_for_line(line)
        self.assertEqual(active.id, r2.id)

    def test_ready_queue_excludes_superseded_ready(self):
        _, line = _order_and_line()
        old = _report_on_line(line, status=ReportLifecycleStatus.READY, revision_number=1)
        DiagnosticReportArtifact.objects.create(
            report=old,
            artifact_type=ReportArtifactType.PDF,
            is_primary=True,
            is_active=True,
            file=_pdf(b"%PDF old"),
        )
        new = _report_on_line(
            line,
            status=ReportLifecycleStatus.PENDING,
            revision_number=2,
            supersedes=old,
        )
        ArtifactUploadService.upload_report_artifacts(
            report=new,
            uploaded_files=[_pdf(b"%PDF new")],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(new)

        qs = ReportQueryService.get_reports_ready_for_delivery()
        ids = set(qs.values_list("id", flat=True))
        self.assertIn(new.id, ids)
        self.assertNotIn(old.id, ids)

    def test_token_lookup_ignores_deleted_delivery_log(self):
        _, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(report)
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        token = log.metadata["delivery_token"]
        log.is_deleted = True
        log.save(update_fields=["is_deleted", "updated_at"])

        log2 = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        token2 = log2.metadata["delivery_token"]

        self.assertIsNone(ReportQueryService.get_report_by_download_token(token=token))
        resolved = ReportQueryService.get_report_by_download_token(token=token2)
        self.assertEqual(resolved.id, report.id)

    def test_get_primary_artifact_uses_prefetch_cache(self):
        _, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        loaded = ReportQueryService.get_report(report.id)
        with CaptureQueriesContext(connection) as ctx:
            primary = ReportQueryService.get_primary_artifact(report=loaded)
        self.assertIsNotNone(primary)
        self.assertEqual(len(ctx.captured_queries), 0)

    def test_multiple_revisions_latest_active_wins(self):
        _, line = _order_and_line()
        r1 = _report_on_line(line, revision_number=1, status=ReportLifecycleStatus.DELIVERED)
        r2 = _report_on_line(
            line,
            revision_number=3,
            status=ReportLifecycleStatus.READY,
            supersedes=r1,
        )
        r_mid = _report_on_line(
            line,
            revision_number=2,
            status=ReportLifecycleStatus.DELIVERED,
            supersedes=r1,
        )
        r2.supersedes = r_mid
        r2.save(update_fields=["supersedes", "updated_at"])

        active = ReportQueryService.get_active_report_for_line(order_test_line=line)
        self.assertEqual(active.id, r2.id)

    def test_empty_primary_file_excluded_from_ready_queue(self):
        _, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.READY)
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type=ReportArtifactType.PDF,
            is_primary=True,
            is_active=True,
            file="",
        )
        qs = ReportQueryService.get_reports_ready_for_delivery()
        self.assertNotIn(report.id, list(qs.values_list("id", flat=True)))

    def test_token_resolves_via_delivery_metadata(self):
        _, line = _order_and_line()
        report = _report_on_line(line, status=ReportLifecycleStatus.PENDING)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf()],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(report)
        log = ReportDeliveryService.prepare_report_delivery(
            report=report,
            recipient_phone="9876543210",
        )
        token = log.metadata["delivery_token"]
        resolved = ReportQueryService.get_report_by_download_token(token=token)
        self.assertEqual(resolved.id, report.id)
