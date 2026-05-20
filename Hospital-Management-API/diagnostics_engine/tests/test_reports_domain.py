"""Tests for diagnostic reporting domain (models, services, aggregation)."""

from __future__ import annotations

import uuid
from datetime import date
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone

from clinic.models import Clinic
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.services.encounter_service import EncounterService
from diagnostics_engine.domain.order_status import OrderStatusAggregationService
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
    build_report_download_filename,
)
from diagnostics_engine.services.reports import (
    ArtifactUploadService,
    ReportWorkflowService,
)
from doctor.models import doctor as DoctorProfile
from labs.choices.tracking import DeliveryStatus
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _minimal_order_with_line(*, service_name: str = "CBC"):
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:8]}")
    doc_user = User.objects.create_user(
        username=f"doc_{uuid.uuid4().hex[:8]}",
        password="pass",
        first_name="Doc",
        last_name="One",
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
    cat = DiagnosticCategory.objects.create(name="Cat", code=f"C-{uuid.uuid4().hex[:6]}")
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
    return order, line, profile, service


class ReportDomainTests(TestCase):
    def test_multi_file_same_version_allowed(self):
        _, line, _, _ = _minimal_order_with_line()
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
        )
        pdf = SimpleUploadedFile("report.pdf", b"%PDF-1.4", content_type="application/pdf")
        csv = SimpleUploadedFile("machine.csv", b"a,b\n1,2", content_type="text/csv")

        ArtifactUploadService.upload_artifact(
            report=report,
            file=pdf,
            artifact_type=ReportArtifactType.PDF,
            is_primary=True,
            version=1,
        )
        ArtifactUploadService.upload_artifact(
            report=report,
            file=csv,
            artifact_type=ReportArtifactType.CSV,
            version=1,
        )
        self.assertEqual(report.artifacts.filter(version=1).count(), 2)

    def test_build_report_download_filename_uses_patient_and_service(self):
        _, line, _, service = _minimal_order_with_line(service_name="Thyroid Profile")
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            ready_at=timezone.now(),
        )
        name = build_report_download_filename(report, extension="pdf")
        self.assertIn("rahul", name.lower())
        self.assertIn("kumar", name.lower())
        self.assertIn("thyroid_profile", name.lower())
        self.assertTrue(name.endswith(".pdf"))

    def test_delivered_lock_prevents_edit(self):
        _, line, _, _ = _minimal_order_with_line()
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.DELIVERED,
        )
        report.refresh_from_db()
        self.assertFalse(report.is_editable)
        self.assertIsNotNone(report.delivered_at)

        report.structured_result = {"note": "tamper"}
        with self.assertRaises(ValidationError):
            report.save()

    def test_ready_sets_ready_at(self):
        _, line, _, _ = _minimal_order_with_line()
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.READY,
        )
        report.refresh_from_db()
        self.assertIsNotNone(report.ready_at)

    def test_primary_artifact_full_clean_rejects_duplicate(self):
        _, line, _, _ = _minimal_order_with_line()
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
        )
        ArtifactUploadService.upload_artifact(
            report=report,
            file=SimpleUploadedFile("a.pdf", b"pdf-a", content_type="application/pdf"),
            is_primary=True,
        )
        second = DiagnosticReportArtifact(
            report=report,
            file=SimpleUploadedFile("b.pdf", b"pdf-b", content_type="application/pdf"),
            is_primary=True,
        )
        with self.assertRaises(ValidationError):
            second.full_clean()

    def test_get_active_report_excludes_superseded(self):
        order, line, _, _ = _minimal_order_with_line()
        old = DiagnosticTestReport.objects.create(
            order_test_line=line,
            status=ReportLifecycleStatus.DELIVERED,
            revision_number=1,
        )
        new = DiagnosticTestReport.objects.create(
            order_test_line=line,
            status=ReportLifecycleStatus.IN_PROGRESS,
            revision_number=2,
            supersedes=old,
        )
        active = get_active_report_for_line(line)
        self.assertEqual(active.pk, new.pk)

    def test_aggregation_uses_active_report_only(self):
        order, line, _, _ = _minimal_order_with_line()
        order.status = OrderStatus.IN_PROCESSING
        order.save(update_fields=["status"])

        old = DiagnosticTestReport(
            order_test_line=line,
            status=ReportLifecycleStatus.DELIVERED,
            revision_number=1,
        )
        new = DiagnosticTestReport(
            order_test_line=line,
            status=ReportLifecycleStatus.PENDING,
            revision_number=2,
            supersedes=old,
        )
        DiagnosticTestReport.objects.bulk_create([old, new])

        self.assertEqual(get_active_report_for_line(line).pk, new.pk)
        OrderStatusAggregationService.sync_from_test_reports(order)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.IN_PROCESSING)

    def test_mark_ready_requires_artifact(self):
        _, line, _, _ = _minimal_order_with_line()
        report = DiagnosticTestReport.objects.create(
            order_test_line=line,
            storage_mode=ReportStorageMode.FILE,
        )
        with self.assertRaises(ValidationError):
            ReportWorkflowService.mark_ready(report)

    def test_delivery_status_uses_labs_enum_default(self):
        _, line, _, _ = _minimal_order_with_line()
        report = DiagnosticTestReport.objects.create(order_test_line=line)
        self.assertEqual(report.delivery_status, DeliveryStatus.PENDING)
