"""Phase 2 operational hardening tests for report upload domain and service."""

from __future__ import annotations

import logging
import uuid
from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from clinic.models import Clinic
from consultations_core.models.audit import ClinicalAuditLog
from consultations_core.models.consultation import Consultation
from consultations_core.services.encounter_service import EncounterService
from diagnostics_engine.domain.reports import get_primary_artifact, upload_rules
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
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from diagnostics_engine.services.reports import (
    ArtifactUploadService,
    ReportDeliveryService,
    ReportQueryService,
    ReportWorkflowService,
)
from diagnostics_engine.services.reports.report_audit import emit_report_audit_event
from doctor.models import doctor as DoctorProfile
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _minimal_order_with_line(*, service_name: str = "CBC"):
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:8]}")
    doc_user = User.objects.create_user(
        username=f"doc_{uuid.uuid4().hex[:8]}",
        password="pass",
    )
    doctor = DoctorProfile.objects.create(user=doc_user, primary_specialization="General")
    doctor.clinics.add(clinic)

    pat_user = User.objects.create_user(username=f"pat_{uuid.uuid4().hex[:8]}", password="pass")
    account = PatientAccount.objects.create(user=pat_user)
    account.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=account,
        first_name="Rahul",
        last_name="Kumar",
        relation="self",
        gender="male",
        date_of_birth=date(1990, 1, 1),
    )
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=account,
        patient_profile=profile,
        doctor=doctor,
        created_by=doc_user,
    )
    consultation = Consultation.objects.create(encounter=encounter)
    order = DiagnosticOrder.objects.create(
        order_number=f"ORD-{uuid.uuid4().hex[:8]}",
        encounter=encounter,
        consultation=consultation,
        patient_profile=profile,
        doctor=doctor,
        status=OrderStatus.IN_PROCESSING,
    )
    cat = DiagnosticCategory.objects.create(
        name=f"Cat-{uuid.uuid4().hex[:6]}",
        code=f"C-{uuid.uuid4().hex[:6]}",
    )
    service = DiagnosticServiceMaster.objects.create(
        code=f"S-{uuid.uuid4().hex[:6]}",
        name=service_name,
        category=cat,
    )
    item = DiagnosticOrderItem.objects.create(
        order=order,
        line_type=OrderLineType.TEST,
        service=service,
        name_snapshot=service_name,
        price_snapshot=100,
    )
    line = DiagnosticOrderTestLine.objects.create(
        order=order,
        order_item=item,
        service=service,
        status=OrderTestLineStatus.IN_PROGRESS,
    )
    return order, line


def _pdf(content: bytes = b"%PDF-1.4 unique") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


def _report(line):
    return DiagnosticTestReport.objects.create(
        order_test_line=line,
        storage_mode=ReportStorageMode.FILE,
        status=ReportLifecycleStatus.PENDING,
    )


class UploadRulesHardeningTests(TestCase):
    def test_compute_file_checksum_deterministic_and_rewinds(self):
        f = _pdf(b"checksum-bytes")
        first = upload_rules.compute_file_checksum(f)
        second = upload_rules.compute_file_checksum(f)
        self.assertEqual(first, second)
        self.assertEqual(f.tell(), 0)

    def test_benign_mime_mismatch_logs_debug(self):
        mismatched = SimpleUploadedFile(
            "report.pdf",
            b"%PDF",
            content_type="image/png",
        )
        with self.assertLogs("diagnostics_engine.domain.reports.upload_rules", level="DEBUG") as logs:
            upload_rules.validate_mime_consistency(mismatched, "pdf", file_index=0)
        self.assertTrue(any("mime_mismatch" in m for m in logs.output))

    def test_spoofing_mime_logs_warning(self):
        spoof = SimpleUploadedFile(
            "report.pdf",
            b"%PDF",
            content_type="application/javascript",
        )
        with self.assertLogs("diagnostics_engine.domain.reports.upload_rules", level="WARNING") as logs:
            upload_rules.validate_mime_consistency(spoof, "pdf", file_index=0)
        self.assertTrue(any("mime_spoofing" in m for m in logs.output))

    @override_settings(MAX_REPORT_BATCH_UPLOAD_SIZE_MB=1)
    def test_batch_total_size_enforced(self):
        files = [_pdf(b"x" * (600 * 1024)), _pdf(b"y" * (600 * 1024))]
        with self.assertRaisesMessage(ValidationError, "Total upload size"):
            upload_rules.validate_batch_total_size(files)


class ArtifactVersionAndReplaceTests(TestCase):
    def test_auto_version_increments_on_upload(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"v1")],
            primary_file_index=0,
        )
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"v2")],
        )
        versions = sorted(report.artifacts.filter(is_active=True).values_list("version", flat=True))
        self.assertEqual(versions, [1, 2])

    def test_inactive_artifact_counted_in_next_version(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        old = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"old")],
            primary_file_index=0,
        )[0]
        ArtifactUploadService.replace_artifact(
            report=report,
            old_artifact=old,
            file=_pdf(b"new"),
        )
        next_v = ArtifactUploadService._next_artifact_version(report)
        self.assertEqual(next_v, 3)

    def test_replace_artifact_demotes_old_and_promotes_new(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        old = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"original")],
            primary_file_index=0,
        )[0]
        new = ArtifactUploadService.replace_artifact(
            report=report,
            old_artifact=old,
            file=_pdf(b"replacement"),
        )
        old.refresh_from_db()
        self.assertFalse(old.is_active)
        self.assertFalse(old.is_primary)
        self.assertTrue(new.is_active)
        self.assertTrue(new.is_primary)
        primary = get_primary_artifact(report)
        self.assertEqual(primary.pk, new.pk)

    def test_replace_artifact_allows_same_checksum(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        content = b"same-checksum-content"
        old = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(content)],
            primary_file_index=0,
        )[0]
        new = ArtifactUploadService.replace_artifact(
            report=report,
            old_artifact=old,
            file=_pdf(content),
        )
        self.assertNotEqual(old.pk, new.pk)
        self.assertEqual(new.checksum, old.checksum)

    def test_replace_artifact_wrong_report_rejected(self):
        _, line_a = _minimal_order_with_line(service_name="A")
        _, line_b = _minimal_order_with_line(service_name="B")
        report_a = _report(line_a)
        report_b = _report(line_b)
        artifact_b = ArtifactUploadService.upload_report_artifacts(
            report=report_b,
            uploaded_files=[_pdf(b"b")],
            primary_file_index=0,
        )[0]
        with self.assertRaisesMessage(ValidationError, "does not belong"):
            ArtifactUploadService.replace_artifact(
                report=report_a,
                old_artifact=artifact_b,
                file=_pdf(b"x"),
            )

    def test_replace_artifact_rollback_preserves_primary(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        old = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"keep-primary")],
            primary_file_index=0,
        )[0]
        with patch.object(
            ArtifactUploadService,
            "_create_artifact",
            side_effect=ValidationError("simulated failure"),
        ):
            with self.assertRaisesMessage(ValidationError, "simulated failure"):
                ArtifactUploadService.replace_artifact(
                    report=report,
                    old_artifact=old,
                    file=_pdf(b"fail"),
                )
        old.refresh_from_db()
        self.assertTrue(old.is_active)
        self.assertTrue(old.is_primary)
        self.assertEqual(report.artifacts.filter(is_active=True, is_primary=True).count(), 1)

    def test_storage_path_shape_no_phi(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        art = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"path")],
            primary_file_index=0,
        )[0]
        art.refresh_from_db()
        self.assertIn("diagnostic-reports/active/", art.storage_path)
        self.assertIn("artifact_", art.storage_path)
        self.assertNotIn("patient-account=", art.storage_path)
        self.assertNotIn("Rahul", art.storage_path)


class CorrectionAndTokenTests(TestCase):
    def test_prepare_correction_upload_creates_superseding_head(self):
        _, line = _minimal_order_with_line()
        old = ArtifactUploadService.create_or_get_report_for_line(order_test_line=line)
        ArtifactUploadService.upload_report_artifacts(
            report=old,
            uploaded_files=[_pdf(b"corr")],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(old)
        new = ArtifactUploadService.prepare_correction_upload(order_test_line=line)
        self.assertEqual(new.supersedes_id, old.pk)
        self.assertEqual(new.revision_number, old.revision_number + 1)
        self.assertEqual(new.status, ReportLifecycleStatus.PENDING)

    def test_superseded_report_token_returns_none(self):
        _, line = _minimal_order_with_line()
        old = _report(line)
        ArtifactUploadService.upload_report_artifacts(
            report=old,
            uploaded_files=[_pdf(b"old-token")],
            primary_file_index=0,
        )
        ReportWorkflowService.mark_ready(old)
        log = ReportDeliveryService.prepare_report_delivery(
            report=old,
            recipient_phone="9876543210",
        )
        token = log.metadata["delivery_token"]

        new = ReportWorkflowService.create_superseding_report(old_report=old)
        ArtifactUploadService.upload_report_artifacts(
            report=new,
            uploaded_files=[_pdf(b"new-head")],
            primary_file_index=0,
        )

        self.assertIsNone(ReportQueryService.get_report_by_download_token(token=token))


class ReportAuditTests(TestCase):
    def test_emit_creates_action_log(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        emit_report_audit_event(action="artifact_uploaded", report=report, metadata={"count": 1})
        log = ClinicalAuditLog.objects.filter(
            object_id=report.pk,
            field_name="action",
            new_value="artifact_uploaded",
        ).first()
        self.assertIsNotNone(log)

    def test_emit_failure_does_not_raise(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        with patch(
            "diagnostics_engine.services.reports.report_audit.ClinicalAuditLog.objects.create",
            side_effect=RuntimeError("audit down"),
        ):
            emit_report_audit_event(action="report_ready", report=report)

    def test_upload_emits_audit(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"audited")],
            primary_file_index=0,
        )
        self.assertTrue(
            ClinicalAuditLog.objects.filter(
                object_id=report.pk,
                new_value="artifact_uploaded",
            ).exists()
        )

    def test_replace_emits_audit(self):
        _, line = _minimal_order_with_line()
        report = _report(line)
        old = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"a")],
            primary_file_index=0,
        )[0]
        ArtifactUploadService.replace_artifact(
            report=report,
            old_artifact=old,
            file=_pdf(b"b"),
        )
        self.assertTrue(
            ClinicalAuditLog.objects.filter(
                object_id=report.pk,
                new_value="artifact_replaced",
            ).exists()
        )
