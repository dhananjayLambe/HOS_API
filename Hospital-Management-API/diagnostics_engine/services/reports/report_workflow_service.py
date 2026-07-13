"""Report generation lifecycle transitions."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.monitoring.report_events import OUTCOME_SUCCESS, emit_report_event, safe_emit
from diagnostics_engine.services.reports.access_control import get_report_branch_id
from diagnostics_engine.services.reports.report_audit import emit_report_audit_event
from diagnostics_engine.services.reports.report_validation_service import ReportValidationService


class ReportWorkflowService:
    """Drive DiagnosticTestReport.status through the generation lifecycle."""

    @classmethod
    @transaction.atomic
    def mark_in_progress(cls, report: DiagnosticTestReport, *, user=None) -> DiagnosticTestReport:
        ReportValidationService.validate_report_editable(report)
        ReportValidationService.validate_status_transition(
            report.status,
            ReportLifecycleStatus.IN_PROGRESS,
            report=report,
        )
        report.status = ReportLifecycleStatus.IN_PROGRESS
        if user is not None:
            report.uploaded_by = report.uploaded_by or user
        report.save()
        return report

    @classmethod
    @transaction.atomic
    def mark_ready(
        cls,
        report: DiagnosticTestReport,
        *,
        user=None,
        notes: str | None = None,
    ) -> DiagnosticTestReport:
        ReportValidationService.validate_report_ready_for_ready_transition(report)
        ReportValidationService.validate_status_transition(
            report.status,
            ReportLifecycleStatus.READY,
            report=report,
        )
        report.status = ReportLifecycleStatus.READY
        report.ready_at = report.ready_at or timezone.now()
        if user is not None:
            report.uploaded_by = report.uploaded_by or user
        report.save()
        audit_metadata = {"notes": notes} if notes else None
        safe_emit(
            emit_report_audit_event,
            action="report_ready",
            report=report,
            user=user,
            metadata=audit_metadata,
        )
        safe_emit(
            emit_report_event,
            "report_marked_ready",
            outcome=OUTCOME_SUCCESS,
            report_id=report.pk,
            branch_id=get_report_branch_id(report),
            user_id=getattr(user, "pk", None),
        )
        try:
            from business_audit.communication.report.hooks import schedule_report_ready

            schedule_report_ready(report=report, user=user)
        except Exception:
            pass
        return report

    @classmethod
    @transaction.atomic
    def mark_delivered(cls, report: DiagnosticTestReport, *, user=None) -> DiagnosticTestReport:
        ReportValidationService.validate_report_ready_for_delivery(report)
        ReportValidationService.validate_status_transition(
            report.status,
            ReportLifecycleStatus.DELIVERED,
            report=report,
        )
        report.status = ReportLifecycleStatus.DELIVERED
        report.delivered_at = report.delivered_at or timezone.now()
        report.is_editable = False
        if user is not None:
            report.delivered_by = user
        report.save()
        return report

    @classmethod
    @transaction.atomic
    def create_superseding_report(
        cls,
        *,
        old_report: DiagnosticTestReport,
        uploaded_by=None,
    ) -> DiagnosticTestReport:
        ReportValidationService.validate_report_can_be_corrected(old_report)
        new_report = DiagnosticTestReport.objects.create(
            order_test_line=old_report.order_test_line,
            storage_mode=old_report.storage_mode,
            revision_number=old_report.revision_number + 1,
            supersedes=old_report,
            status=ReportLifecycleStatus.PENDING,
            uploaded_by=uploaded_by,
        )
        safe_emit(
            emit_report_audit_event,
            action="report_superseded",
            report=new_report,
            user=uploaded_by,
            metadata={
                "supersedes_report_id": str(old_report.pk),
                "revision_number": new_report.revision_number,
            },
        )
        safe_emit(
            emit_report_event,
            "report_corrected",
            outcome=OUTCOME_SUCCESS,
            report_id=new_report.pk,
            branch_id=get_report_branch_id(new_report),
            user_id=getattr(uploaded_by, "pk", None),
            extra={"supersedes_report_id": str(old_report.pk)},
        )
        return new_report
