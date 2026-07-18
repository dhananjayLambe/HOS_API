"""Shared fixtures for doctor_report_workspace integration tests."""

from __future__ import annotations

import uuid
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from diagnostics_engine.models import (
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderTestLine,
)
from diagnostics_engine.models.choices import (
    OrderLineType,
    OrderTestLineStatus,
    ReportLifecycleStatus,
    ReportStorageMode,
)
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from diagnostics_engine.tests.test_order_creation_service import _create_catalog_service
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.patient import PatientProfileFactory
from tests.factories.user import UserFactory


def pdf(content: bytes = b"%PDF-1.4 test") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


def make_doctor_with_clinic():
    clinic = ClinicFactory()
    user = UserFactory(username=f"91{uuid.uuid4().int % 10**10:010d}")
    ensure_doctor_group(user)
    doc = DoctorFactory(user=user, clinics=(clinic,))
    return user, doc, clinic


def create_order_line(
    *,
    doctor,
    clinic,
    service_name: str = "CBC Report",
    line_status: str = OrderTestLineStatus.PENDING,
    patient_first: str = "Report",
    patient_last: str = "Patient",
):
    service = _create_catalog_service(name=service_name)
    profile = PatientProfileFactory(first_name=patient_first, last_name=patient_last)
    encounter = ClinicalEncounter.objects.create(
        clinic=clinic,
        doctor=doctor,
        patient_account=profile.account,
        patient_profile=profile,
        status="created",
        is_active=True,
    )
    consultation = Consultation.objects.create(encounter=encounter)
    consultation.is_finalized = True
    consultation.ended_at = timezone.now()
    consultation.save()
    ClinicalEncounter.objects.filter(pk=encounter.pk).update(
        status="consultation_completed",
        is_active=False,
    )
    encounter.refresh_from_db()

    order = DiagnosticOrder.objects.create(
        order_number=f"ORD-{uuid.uuid4().hex[:6].upper()}",
        encounter=encounter,
        consultation=consultation,
        patient_profile=profile,
        doctor=doctor,
    )
    order_item = DiagnosticOrderItem.objects.create(
        order=order,
        line_type=OrderLineType.TEST,
        service=service,
        name_snapshot=service.name,
        price_snapshot=100,
    )
    line = DiagnosticOrderTestLine.objects.create(
        order=order,
        order_item=order_item,
        service=service,
        status=line_status,
    )
    return line, order, profile, consultation, encounter


def create_ready_report(*, line, with_artifact: bool = True):
    report = DiagnosticTestReport.objects.create(
        order_test_line=line,
        status=ReportLifecycleStatus.READY,
        storage_mode=ReportStorageMode.FILE,
        revision_number=1,
        report_number=f"R-{uuid.uuid4().hex[:6].upper()}",
        ready_at=timezone.now(),
        uploaded_at=timezone.now(),
        structured_result="Hb normal",
    )
    if with_artifact:
        DiagnosticReportArtifact.objects.create(
            report=report,
            artifact_type="PDF",
            is_primary=True,
            is_active=True,
            file=pdf(),
            original_filename="report.pdf",
            download_filename="report.pdf",
        )
    return report


def mark_line_pending_upload(*, line, minutes_ago: int = 60):
    line.status = OrderTestLineStatus.COMPLETED
    line.save(update_fields=["status", "updated_at"])
    DiagnosticOrderTestLine.objects.filter(pk=line.pk).update(
        updated_at=timezone.now() - timedelta(minutes=minutes_ago)
    )
    line.refresh_from_db()
    return line
