"""Tests for ArtifactUploadService."""

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
from diagnostics_engine.domain.reports import get_primary_artifact
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
from diagnostics_engine.services.reports import ArtifactUploadService
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


def _csv(content: bytes = b"col\n1") -> SimpleUploadedFile:
    return SimpleUploadedFile("machine.csv", content, content_type="application/octet-stream")


class ArtifactUploadServiceTests(TestCase):
    def _report(self, line):
        return DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )

    def test_multi_file_same_version_allowed(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        artifacts = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"pdf-a"), _csv(b"csv-b")],
            primary_file_index=0,
            version=1,
        )
        self.assertEqual(len(artifacts), 2)
        self.assertEqual(report.artifacts.filter(version=1, is_active=True).count(), 2)

    def test_duplicate_checksum_rejected(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        content = b"same-content"
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(content)],
            primary_file_index=0,
        )
        with self.assertRaisesMessage(ValidationError, "This file was already uploaded."):
            ArtifactUploadService.upload_report_artifacts(
                report=report,
                uploaded_files=[_pdf(content)],
            )

    def test_duplicate_in_same_batch_rejected(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        content = b"dup-in-batch"
        with self.assertRaisesMessage(ValidationError, "This file was already uploaded."):
            ArtifactUploadService.upload_report_artifacts(
                report=report,
                uploaded_files=[_pdf(content), _pdf(content)],
            )
        self.assertEqual(report.artifacts.count(), 0)

    def test_invalid_extension_rejected(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        bad = SimpleUploadedFile("virus.exe", b"MZ", content_type="application/octet-stream")
        with self.assertRaises(ValidationError):
            ArtifactUploadService.upload_report_artifacts(report=report, uploaded_files=[bad])

    def test_empty_file_rejected(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        empty = SimpleUploadedFile("empty.pdf", b"", content_type="application/pdf")
        with self.assertRaises(ValidationError):
            ArtifactUploadService.upload_report_artifacts(report=report, uploaded_files=[empty])

    def test_replace_primary_artifact(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        first, second = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"a"), _csv(b"b")],
            primary_file_index=0,
        )
        ArtifactUploadService.replace_primary_artifact(report=report, artifact=second)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.is_primary)
        self.assertTrue(second.is_primary)
        self.assertTrue(first.is_active)

    def test_batch_validation_rollback_no_partial_artifacts(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        good = _pdf(b"ok")
        bad = SimpleUploadedFile("bad.exe", b"x", content_type="application/octet-stream")
        with self.assertRaises(ValidationError):
            ArtifactUploadService.upload_report_artifacts(
                report=report,
                uploaded_files=[good, bad],
            )
        self.assertEqual(report.artifacts.count(), 0)

    def test_create_or_get_report_for_line_idempotent(self):
        _, line = _minimal_order_with_line()
        r1 = ArtifactUploadService.create_or_get_report_for_line(order_test_line=line)
        r2 = ArtifactUploadService.create_or_get_report_for_line(order_test_line=line)
        self.assertEqual(r1.pk, r2.pk)

    def test_lifecycle_pending_to_in_progress_on_upload(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"life")],
            primary_file_index=0,
        )
        report.refresh_from_db()
        self.assertEqual(report.status, ReportLifecycleStatus.IN_PROGRESS)

    def test_metadata_persisted(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        artifacts = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"meta")],
            primary_file_index=0,
        )
        art = artifacts[0]
        art.refresh_from_db()
        self.assertEqual(art.original_filename, "report.pdf")
        self.assertEqual(art.file_extension, "pdf")
        self.assertTrue(art.checksum)
        self.assertGreater(art.file_size, 0)
        self.assertTrue(art.content_type)
        self.assertTrue(art.download_filename)
        self.assertTrue(art.storage_path)

    def test_invalid_primary_file_index_raises_value_error(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        with self.assertRaises(ValueError):
            ArtifactUploadService.upload_report_artifacts(
                report=report,
                uploaded_files=[_pdf(b"one")],
                primary_file_index=3,
            )

    def test_second_batch_preserves_existing_artifacts(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        first_batch = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"batch1")],
            primary_file_index=0,
        )
        second_batch = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_csv(b"batch2")],
        )
        self.assertEqual(report.artifacts.filter(is_active=True).count(), 2)
        first_batch[0].refresh_from_db()
        self.assertTrue(first_batch[0].is_active)
        self.assertTrue(first_batch[0].is_primary)
        self.assertFalse(second_batch[0].is_primary)

    def test_second_batch_can_replace_primary(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"old-primary")],
            primary_file_index=0,
        )
        new_files = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_csv(b"new-primary")],
            primary_file_index=0,
        )
        primary = get_primary_artifact(report)
        self.assertEqual(primary.pk, new_files[0].pk)

    def test_hybrid_storage_mode_not_downgraded(self):
        _, line = _minimal_order_with_line()
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.HYBRID,
            status=ReportLifecycleStatus.PENDING,
        )
        ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"hybrid")],
            primary_file_index=0,
        )
        report.refresh_from_db()
        self.assertEqual(report.storage_mode, ReportStorageMode.HYBRID)

    def test_confirm_report_upload(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        user = User.objects.create_user(username=f"u_{uuid.uuid4().hex[:8]}", password="pass")
        confirmed = ArtifactUploadService.confirm_report_upload(report=report, uploaded_by=user)
        confirmed.refresh_from_db()
        self.assertEqual(confirmed.status, ReportLifecycleStatus.IN_PROGRESS)
        self.assertEqual(confirmed.uploaded_by_id, user.pk)

    @override_settings(MAX_REPORT_UPLOAD_FILES=2)
    def test_max_file_count_enforced(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        files = [_pdf(bytes([i])) for i in range(3)]
        with self.assertRaises(ValidationError):
            ArtifactUploadService.upload_report_artifacts(report=report, uploaded_files=files)

    def test_octet_stream_pdf_allowed(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        generic_pdf = SimpleUploadedFile(
            "report.pdf",
            b"%PDF-1.4 octet",
            content_type="application/octet-stream",
        )
        artifacts = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[generic_pdf],
            primary_file_index=0,
        )
        self.assertEqual(len(artifacts), 1)

    def test_locked_report_rejects_upload(self):
        _, line = _minimal_order_with_line()
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.DELIVERED,
            is_editable=False,
        )
        with self.assertRaisesMessage(ValidationError, "Report is locked"):
            ArtifactUploadService.upload_report_artifacts(
                report=report,
                uploaded_files=[_pdf(b"locked")],
            )

    def test_prepare_correction_upload_requires_active_report(self):
        _, line = _minimal_order_with_line()
        with self.assertRaisesMessage(ValidationError, "No active report"):
            ArtifactUploadService.prepare_correction_upload(order_test_line=line)

    @override_settings(MAX_REPORT_UPLOAD_SIZE_MB=1)
    def test_max_file_size_enforced(self):
        _, line = _minimal_order_with_line()
        report = self._report(line)
        huge = SimpleUploadedFile(
            "big.pdf",
            b"x" * (2 * 1024 * 1024),
            content_type="application/pdf",
        )
        with self.assertRaises(ValidationError):
            ArtifactUploadService.upload_report_artifacts(report=report, uploaded_files=[huge])
