"""Shared helpers for communication audit tests."""

from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from business_audit.communication.context import build_report_communication_context
from business_audit.communication.types import CommunicationContext
from business_audit.tests.booking.support import create_booking_order, setup_booking_context
from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.services.reports import ArtifactUploadService, ReportWorkflowService
from tests.factories.clinic import ClinicFactory

User = get_user_model()
DOWNLOAD_BASE = "https://test.example/report-download"


def communication_context_stub(*, clinic=None, attempt_number: int = 1) -> tuple[CommunicationContext, str]:
    clinic = clinic or ClinicFactory()
    comm_id = str(uuid.uuid4())
    attempt_id = str(uuid.uuid4())
    ctx = CommunicationContext(
        communication_id=comm_id,
        communication_type="REPORT",
        communication_attempt_id=attempt_id,
        attempt_number=attempt_number,
        artifact_type="LAB_REPORT_PDF",
        artifact_version=1,
        artifact_size_bytes=1024,
        mime_type="application/pdf",
        report_id=comm_id,
        booking_id=str(uuid.uuid4()),
        routing_id=str(uuid.uuid4()),
        recommendation_id=str(uuid.uuid4()),
        patient_account_id=str(uuid.uuid4()),
        consultation_id=str(uuid.uuid4()),
        recipient="+919999999999",
    )
    return ctx, str(clinic.id)


def _pdf(content: bytes = b"%PDF-1.4 test") -> SimpleUploadedFile:
    return SimpleUploadedFile("report.pdf", content, content_type="application/pdf")


@override_settings(REPORT_PUBLIC_DOWNLOAD_BASE_URL=DOWNLOAD_BASE)
def create_ready_report_for_booking(ctx: dict, *, user=None, execute_commit: bool = True):
    """Create a READY report linked to a diagnostic order from booking context."""
    order = create_booking_order(ctx)
    line = order.test_lines.first()
    if line is None:
        from diagnostics_engine.models import DiagnosticOrderTestLine
        from diagnostics_engine.models.choices import OrderLineType, OrderTestLineStatus

        item = order.items.first()
        line = DiagnosticOrderTestLine.objects.create(
            order=order,
            order_item=item,
            line_type=OrderLineType.SINGLE,
            status=OrderTestLineStatus.IN_PROCESSING,
        )
    user = user or ctx["doctor_user"]
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
    if execute_commit:
        from django.test import TestCase

        with TestCase.captureOnCommitCallbacks(execute=True):
            ReportWorkflowService.mark_ready(report, user=user)
    else:
        ReportWorkflowService.mark_ready(report, user=user)
    report.refresh_from_db()
    return report, order


def build_ctx_from_report(report, *, delivery_log=None) -> CommunicationContext:
    return build_report_communication_context(report, delivery_log=delivery_log)


__all__ = [
    "setup_booking_context",
    "create_booking_order",
    "communication_context_stub",
    "create_ready_report_for_booking",
    "build_ctx_from_report",
    "DOWNLOAD_BASE",
]
