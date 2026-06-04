"""
Central validation orchestration for diagnostic report workflows.

Validates only — no save, upload, transition, or delivery side effects.
"""

from __future__ import annotations

import logging
import re
from django.core.exceptions import ValidationError

from diagnostics_engine.domain.reports import active_reports_queryset, get_primary_artifact
from diagnostics_engine.domain.reports import upload_rules
from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.reports import DiagnosticReportArtifact, DiagnosticTestReport
from labs.choices.tracking import DeliveryStatus
from labs.models.lab_tracking import LabReportDeliveryLog

logger = logging.getLogger(__name__)

_PHONE_DIGIT_RE = re.compile(r"\d")

_GENERATION_TRANSITIONS: dict[str, frozenset[str]] = {
    ReportLifecycleStatus.PENDING: frozenset({ReportLifecycleStatus.IN_PROGRESS}),
    ReportLifecycleStatus.IN_PROGRESS: frozenset(
        {ReportLifecycleStatus.READY, ReportLifecycleStatus.REJECTED}
    ),
    ReportLifecycleStatus.READY: frozenset(
        {ReportLifecycleStatus.DELIVERED, ReportLifecycleStatus.REJECTED}
    ),
    ReportLifecycleStatus.DELIVERED: frozenset(),
    ReportLifecycleStatus.REJECTED: frozenset({ReportLifecycleStatus.IN_PROGRESS}),
}

_DELIVERY_TRANSITIONS: dict[str, frozenset[str]] = {
    DeliveryStatus.PENDING: frozenset({DeliveryStatus.SENT, DeliveryStatus.FAILED}),
    DeliveryStatus.SENT: frozenset({DeliveryStatus.DELIVERED, DeliveryStatus.FAILED}),
    DeliveryStatus.DELIVERED: frozenset({DeliveryStatus.VIEWED}),
    DeliveryStatus.VIEWED: frozenset(),
    DeliveryStatus.FAILED: frozenset(),
}

_CORRECTABLE_STATUSES = frozenset(
    {ReportLifecycleStatus.READY, ReportLifecycleStatus.DELIVERED}
)


class ReportValidationService:
    """Operational workflow validation — single source of truth for report gates."""

    # ------------------------------------------------------------------ report lifecycle

    @classmethod
    def validate_report_active(cls, report: DiagnosticTestReport) -> None:
        if report.deleted_at is not None:
            raise ValidationError("Report has been deleted.")

    @classmethod
    def validate_report_not_superseded(cls, report: DiagnosticTestReport) -> None:
        if not cls._is_active_head(report):
            raise ValidationError("Report has been superseded and is no longer active.")

    @classmethod
    def validate_report_editable(cls, report: DiagnosticTestReport) -> None:
        cls.validate_report_active(report)
        cls.validate_report_not_superseded(report)
        if not report.is_editable:
            raise ValidationError("Report is locked.")

    @classmethod
    def validate_report_ready_for_upload(cls, report: DiagnosticTestReport) -> None:
        cls.validate_report_editable(report)
        if report.status in (
            ReportLifecycleStatus.DELIVERED,
            ReportLifecycleStatus.REJECTED,
        ):
            raise ValidationError(
                f"Cannot upload artifacts when report status is {report.status}."
            )

    @classmethod
    def validate_report_ready_for_reupload(cls, report: DiagnosticTestReport) -> None:
        """
        In-place artifact replacement (REUPLOAD_REPLACE).

        Allows READY and DELIVERED heads even when ``is_editable`` is false after delivery.
        Does not permit REJECTED or superseded reports.
        """
        cls.validate_report_active(report)
        cls.validate_report_not_superseded(report)
        if report.status == ReportLifecycleStatus.REJECTED:
            raise ValidationError("Cannot replace artifacts on a rejected report.")
        if report.status not in (
            ReportLifecycleStatus.PENDING,
            ReportLifecycleStatus.IN_PROGRESS,
            ReportLifecycleStatus.READY,
            ReportLifecycleStatus.DELIVERED,
        ):
            raise ValidationError(
                f"Cannot replace artifacts when report status is {report.status}."
            )

    @classmethod
    def validate_report_has_active_artifacts(cls, report: DiagnosticTestReport) -> None:
        if not report.artifacts.filter(is_active=True).exists():
            raise ValidationError("At least one active artifact is required.")

    @classmethod
    def validate_report_ready_for_ready_transition(cls, report: DiagnosticTestReport) -> None:
        cls.validate_report_editable(report)
        cls.validate_report_active(report)
        cls.validate_report_not_superseded(report)
        if report.status != ReportLifecycleStatus.IN_PROGRESS:
            raise ValidationError(
                f"Report must be in progress before marking ready (current: {report.status})."
            )
        cls.validate_report_has_active_artifacts(report)
        cls.validate_deterministic_primary_artifact(report)
        cls.validate_primary_artifact_exists(report)

    @classmethod
    def validate_report_ready_for_delivery(cls, report: DiagnosticTestReport) -> None:
        cls.validate_report_active(report)
        cls.validate_report_not_superseded(report)
        if report.status not in (
            ReportLifecycleStatus.READY,
            ReportLifecycleStatus.DELIVERED,
        ):
            raise ValidationError(
                f"Report must be READY or DELIVERED for delivery (current: {report.status})."
            )
        cls.validate_deterministic_primary_artifact(report)
        cls.validate_primary_artifact_exists(report)

    @classmethod
    def validate_deterministic_primary_artifact(cls, report: DiagnosticTestReport) -> None:
        active_artifacts = report.artifacts.filter(is_active=True)
        if not active_artifacts.exists():
            return

        primary_qs = active_artifacts.filter(is_primary=True)
        primary_count = primary_qs.count()
        if primary_count == 1:
            return

        if primary_count == 0:
            reason = "No active primary artifact found while active artifacts exist."
            cls._emit_artifact_gap_warning(report, code="PRIMARY_MISSING", message=reason)
            raise ValidationError(reason)

        reason = "Multiple active primary artifacts found for this report."
        cls._emit_artifact_gap_warning(report, code="MULTIPLE_PRIMARY", message=reason)
        raise ValidationError(reason)

    @classmethod
    def validate_report_can_be_corrected(cls, report: DiagnosticTestReport) -> None:
        cls.validate_report_active(report)
        cls.validate_report_not_superseded(report)
        if report.status == ReportLifecycleStatus.REJECTED:
            raise ValidationError("Rejected reports cannot be superseded for correction.")
        if report.status not in _CORRECTABLE_STATUSES:
            raise ValidationError(
                f"Report status {report.status} is not eligible for correction supersede."
            )

    # ------------------------------------------------------------------ artifacts

    @classmethod
    def validate_primary_artifact_exists(cls, report: DiagnosticTestReport) -> DiagnosticReportArtifact:
        artifact = get_primary_artifact(report)
        if artifact is None:
            raise ValidationError("Primary report artifact is required.")
        if not artifact.is_active:
            raise ValidationError("Primary artifact must be active.")
        if not cls._has_stored_file(artifact):
            raise ValidationError("Primary artifact must have a stored file.")
        return artifact

    @classmethod
    def validate_primary_artifact_integrity(
        cls,
        report: DiagnosticTestReport,
        *,
        artifact: DiagnosticReportArtifact | None = None,
    ) -> None:
        """Duplicate and ownership checks only; zero primaries allowed for draft uploads."""
        if artifact is not None:
            cls.validate_artifact_belongs_to_report(artifact, report)

        duplicate_primaries = report.artifacts.filter(is_primary=True, is_active=True)
        if artifact is not None and artifact.pk:
            duplicate_primaries = duplicate_primaries.exclude(pk=artifact.pk)
        if duplicate_primaries.count() > 1:
            raise ValidationError("Only one active primary artifact is allowed per report.")
        if artifact is not None and artifact.is_primary and not artifact.is_active:
            raise ValidationError("Primary artifact must be active.")

    @classmethod
    def validate_artifact_belongs_to_report(
        cls,
        artifact: DiagnosticReportArtifact,
        report: DiagnosticTestReport,
    ) -> None:
        if artifact.report_id != report.pk:
            raise ValidationError("Artifact does not belong to this report.")

    @classmethod
    def validate_artifact_active(cls, artifact: DiagnosticReportArtifact) -> None:
        if not artifact.is_active:
            raise ValidationError("Artifact is not active.")
        cls.validate_report_active(artifact.report)

    @classmethod
    def validate_artifact_upload_batch(cls, uploaded_files: list) -> None:
        files = list(uploaded_files or [])
        if not files:
            raise ValidationError("At least one file is required.")
        upload_rules.validate_batch_limits(files)
        for index, uploaded in enumerate(files):
            upload_rules.validate_uploaded_file(uploaded, file_index=index)

    # ------------------------------------------------------------------ delivery

    @classmethod
    def validate_delivery_phone(cls, phone: str) -> str:
        raw = (phone or "").strip()
        if not raw:
            raise ValidationError("Recipient phone is required.")
        parts: list[str] = []
        for ch in raw:
            if ch in " \t-":
                continue
            parts.append(ch)
        normalized = "".join(parts)
        digits = _PHONE_DIGIT_RE.findall(normalized)
        if len(digits) < 10 or len(digits) > 15:
            raise ValidationError("Recipient phone must contain 10–15 digits.")
        if len(normalized) > 20:
            raise ValidationError("Recipient phone must be at most 20 characters.")
        return normalized

    @classmethod
    def validate_delivery_log_retryable(cls, log: LabReportDeliveryLog) -> None:
        if log.is_deleted:
            raise ValidationError("Cannot retry a deleted delivery log.")
        if log.delivery_status == DeliveryStatus.PENDING:
            raise ValidationError("Cannot retry a delivery that is still pending.")
        if log.delivery_status in (DeliveryStatus.DELIVERED, DeliveryStatus.VIEWED):
            raise ValidationError("Cannot retry a successfully delivered log.")

    # ------------------------------------------------------------------ transitions

    @classmethod
    def validate_status_transition(
        cls,
        current_status: str,
        target_status: str,
        *,
        report: DiagnosticTestReport | None = None,
    ) -> None:
        current = cls._normalize_generation_status(current_status)
        target = cls._normalize_generation_status(target_status)
        if report is not None:
            cls.validate_report_not_superseded(report)
        allowed = _GENERATION_TRANSITIONS.get(current)
        if allowed is None:
            raise ValidationError(f"Unknown report lifecycle status: {current_status!r}.")
        if target not in allowed:
            raise ValidationError(
                f"Invalid report status transition from {current} to {target}."
            )

    @classmethod
    def validate_delivery_status_transition(
        cls,
        current_status: str,
        target_status: str,
    ) -> None:
        current = cls._normalize_delivery_status(current_status)
        target = cls._normalize_delivery_status(target_status)
        allowed = _DELIVERY_TRANSITIONS.get(current)
        if allowed is None:
            raise ValidationError(f"Unknown delivery status: {current_status!r}.")
        if target not in allowed:
            raise ValidationError(
                f"Invalid delivery status transition from {current} to {target}."
            )

    # ------------------------------------------------------------------ private helpers

    @classmethod
    def _is_active_head(cls, report: DiagnosticTestReport) -> bool:
        cached = getattr(report, "_validation_active_head", None)
        if cached is not None:
            return bool(cached)
        is_head = active_reports_queryset().filter(pk=report.pk).exists()
        report._validation_active_head = is_head
        return is_head

    @staticmethod
    def _has_stored_file(artifact: DiagnosticReportArtifact) -> bool:
        if not artifact.file:
            return False
        return bool(str(artifact.file).strip())

    @classmethod
    def _emit_artifact_gap_warning(
        cls,
        report: DiagnosticTestReport,
        *,
        code: str,
        message: str,
    ) -> None:
        from diagnostics_engine.monitoring.report_events import safe_emit
        from diagnostics_engine.services.reports.report_audit import emit_report_audit_event

        logger.warning(
            "report_artifact_primary_gap report_id=%s code=%s message=%s",
            report.pk,
            code,
            message,
        )
        safe_emit(
            emit_report_audit_event,
            action="artifact_primary_gap_detected",
            report=report,
            metadata={"code": code, "message": message},
        )

    @staticmethod
    def _normalize_generation_status(status: str) -> str:
        normalized = str(status).strip().lower()
        if normalized not in ReportLifecycleStatus.values:
            raise ValidationError(f"Unknown report lifecycle status: {status!r}.")
        return normalized

    @staticmethod
    def _normalize_delivery_status(status: str) -> str:
        normalized = str(status).strip().upper()
        if normalized not in DeliveryStatus.values:
            raise ValidationError(f"Unknown delivery status: {status!r}.")
        return normalized
