"""
Channel delivery orchestration for diagnostic test reports.

Generation lifecycle (``DiagnosticTestReport.status``) is separate from channel
delivery (``LabReportDeliveryLog.delivery_status``). The report's
``delivery_status`` field is a mirror derived only via ``sync_report_delivery_status``.

Retry policy: each retry creates a **new** delivery log row (append-only audit).
Failed rows are never mutated except via explicit status transitions on that row.
``retry_count`` applies to the new retry row only.

Phase 1: ``metadata`` stores artifact_id, download_url, delivery_token, retry_of_log_id.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from labs.choices.tracking import DeliveryStatus
from labs.models.lab_tracking import LabReportDeliveryLog

from diagnostics_engine.models.choices import ReportLifecycleStatus
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.monitoring.report_events import OUTCOME_FAILED, OUTCOME_SUCCESS, emit_report_event, safe_emit
from diagnostics_engine.services.reports.access_control import get_report_branch_id
from diagnostics_engine.services.reports.report_audit import emit_report_audit_event
from diagnostics_engine.services.reports.report_validation_service import ReportValidationService
from diagnostics_engine.services.reports.report_workflow_service import ReportWorkflowService

logger = logging.getLogger("diagnostics.reports")

class ReportDeliveryService:
    """Prepare, send, confirm, retry, and aggregate channel delivery for reports."""

    # ------------------------------------------------------------------ public API

    @classmethod
    @transaction.atomic
    def prepare_report_delivery(
        cls,
        *,
        report: DiagnosticTestReport,
        recipient_phone: str,
        initiated_by=None,
        channel: str = "WHATSAPP",
    ) -> LabReportDeliveryLog:
        ReportValidationService.validate_report_ready_for_delivery(report)
        phone = ReportValidationService.validate_delivery_phone(recipient_phone)
        artifact = ReportValidationService.validate_primary_artifact_exists(report)
        download_url, token = cls._build_delivery_download_url()

        metadata: dict[str, Any] = {
            "artifact_id": str(artifact.id),
            "download_url": download_url,
            "delivery_token": token,
        }
        log = cls._create_delivery_log(
            report=report,
            channel=channel,
            recipient=phone,
            delivery_status=DeliveryStatus.PENDING,
            metadata=metadata,
            initiated_by=initiated_by,
        )
        cls.sync_report_delivery_status(report=report)
        safe_emit(
            emit_report_audit_event,
            action="delivery_prepared",
            report=report,
            user=initiated_by,
            metadata={"log_id": str(log.id), "channel": channel},
        )
        safe_emit(
            emit_report_event,
            "report_delivery_prepared",
            outcome=OUTCOME_SUCCESS,
            report_id=report.id,
            branch_id=get_report_branch_id(report),
            user_id=getattr(initiated_by, "pk", None),
            extra={"delivery_log_id": str(log.id), "channel": channel},
        )
        logger.info(
            "Prepared report delivery report_id=%s log_id=%s channel=%s",
            report.id,
            log.id,
            channel,
        )
        return log

    @classmethod
    @transaction.atomic
    def mark_delivery_sent(
        cls,
        *,
        delivery_log: LabReportDeliveryLog,
        external_message_id: str | None = None,
    ) -> LabReportDeliveryLog:
        report = delivery_log.diagnostic_test_report
        ReportValidationService.validate_delivery_status_transition(
            delivery_log.delivery_status,
            DeliveryStatus.SENT,
        )
        cls._apply_log_status(
            delivery_log,
            DeliveryStatus.SENT,
            sent_at=timezone.now(),
            external_message_id=external_message_id,
        )
        cls.sync_report_delivery_status(report=report)
        safe_emit(
            emit_report_event,
            "report_delivery_sent",
            outcome=OUTCOME_SUCCESS,
            report_id=report.id,
            branch_id=get_report_branch_id(report),
            extra={"delivery_log_id": str(delivery_log.id)},
        )
        logger.info("Marked delivery sent log_id=%s report_id=%s", delivery_log.id, report.id)
        return delivery_log

    @classmethod
    @transaction.atomic
    def mark_delivery_delivered(
        cls,
        *,
        delivery_log: LabReportDeliveryLog,
        user=None,
    ) -> LabReportDeliveryLog:
        """
        Channel DELIVERED.

        Phase 1: generation ``DELIVERED`` mirrors successful patient channel delivery
        when the report is still ``READY``. Clinically, delivered / viewed /
        acknowledged / finalized may diverge in a later phase.
        """
        report = delivery_log.diagnostic_test_report
        now = timezone.now()
        ReportValidationService.validate_delivery_status_transition(
            delivery_log.delivery_status,
            DeliveryStatus.DELIVERED,
        )
        cls._apply_log_status(
            delivery_log,
            DeliveryStatus.DELIVERED,
            sent_at=delivery_log.sent_at or now,
            delivered_at=now,
        )
        cls.sync_report_delivery_status(report=report)
        if report.status == ReportLifecycleStatus.READY:
            ReportWorkflowService.mark_delivered(report, user=user)
        logger.info("Marked delivery delivered log_id=%s report_id=%s", delivery_log.id, report.id)
        return delivery_log

    @classmethod
    @transaction.atomic
    def mark_delivery_failed(
        cls,
        *,
        delivery_log: LabReportDeliveryLog,
        reason: str | None = None,
    ) -> LabReportDeliveryLog:
        report = delivery_log.diagnostic_test_report
        ReportValidationService.validate_delivery_status_transition(
            delivery_log.delivery_status,
            DeliveryStatus.FAILED,
        )
        cls._apply_log_status(
            delivery_log,
            DeliveryStatus.FAILED,
            failure_reason=reason or "",
        )
        cls.sync_report_delivery_status(report=report)
        safe_emit(
            emit_report_event,
            "report_delivery_failed",
            outcome=OUTCOME_FAILED,
            report_id=report.id,
            branch_id=get_report_branch_id(report),
            extra={"delivery_log_id": str(delivery_log.id), "reason": reason or ""},
        )
        logger.warning(
            "Marked delivery failed log_id=%s report_id=%s reason=%s",
            delivery_log.id,
            report.id,
            reason,
        )
        return delivery_log

    @classmethod
    @transaction.atomic
    def retry_delivery(
        cls,
        *,
        delivery_log: LabReportDeliveryLog,
        initiated_by=None,
    ) -> LabReportDeliveryLog:
        ReportValidationService.validate_delivery_log_retryable(delivery_log)
        report = DiagnosticTestReport.objects.select_for_update().get(
            pk=delivery_log.diagnostic_test_report_id,
        )
        ReportValidationService.validate_report_ready_for_delivery(report)
        artifact = ReportValidationService.validate_primary_artifact_exists(report)
        download_url, token = cls._build_delivery_download_url()

        parent_retry = delivery_log.retry_count or 0
        metadata: dict[str, Any] = {
            "artifact_id": str(artifact.id),
            "download_url": download_url,
            "delivery_token": token,
            "retry_of_log_id": str(delivery_log.id),
        }
        new_log = cls._create_delivery_log(
            report=report,
            channel=delivery_log.delivery_channel,
            recipient=delivery_log.recipient,
            delivery_status=DeliveryStatus.PENDING,
            metadata=metadata,
            initiated_by=initiated_by,
            retry_count=parent_retry + 1,
        )
        cls.sync_report_delivery_status(report=report)
        safe_emit(
            emit_report_audit_event,
            action="delivery_retry",
            report=report,
            user=initiated_by,
            metadata={
                "parent_log_id": str(delivery_log.id),
                "new_log_id": str(new_log.id),
            },
        )
        safe_emit(
            emit_report_event,
            "report_delivery_retry",
            outcome=OUTCOME_SUCCESS,
            report_id=report.id,
            branch_id=get_report_branch_id(report),
            user_id=getattr(initiated_by, "pk", None),
            extra={
                "parent_delivery_log_id": str(delivery_log.id),
                "new_delivery_log_id": str(new_log.id),
            },
        )
        logger.info(
            "Created delivery retry report_id=%s parent_log_id=%s new_log_id=%s",
            report.id,
            delivery_log.id,
            new_log.id,
        )
        return new_log

    @classmethod
    @transaction.atomic
    def sync_report_delivery_status(cls, *, report: DiagnosticTestReport) -> DiagnosticTestReport:
        aggregate = cls._resolve_aggregate_delivery_status(report)
        if report.delivery_status != aggregate:
            report.delivery_status = aggregate
            report.updated_at = timezone.now()
            report.save(update_fields=["delivery_status", "updated_at"])
        return report

    # ------------------------------------------------------------------ backward compat

    @classmethod
    @transaction.atomic
    def record_delivery_attempt(
        cls,
        *,
        report: DiagnosticTestReport,
        channel: str,
        recipient: str,
        delivery_status: str,
        user=None,
        external_message_id: str | None = None,
        failure_reason: str | None = None,
        metadata: dict | None = None,
    ) -> LabReportDeliveryLog:
        """
        Deprecated compatibility helper.

        Bypasses the prepare → mark_* lifecycle and can create logs at arbitrary
        statuses. Prefer ``prepare_report_delivery`` plus ``mark_delivery_sent`` /
        ``mark_delivery_delivered`` / ``mark_delivery_failed`` for new code.
        """
        phone = ReportValidationService.validate_delivery_phone(recipient)
        ReportValidationService.validate_report_ready_for_delivery(report)
        artifact = ReportValidationService.validate_primary_artifact_exists(report)

        base_metadata = dict(metadata or {})
        if "artifact_id" not in base_metadata:
            base_metadata["artifact_id"] = str(artifact.id)
        if delivery_status in (DeliveryStatus.PENDING, DeliveryStatus.SENT, DeliveryStatus.DELIVERED):
            if "download_url" not in base_metadata:
                url, token = cls._build_delivery_download_url()
                base_metadata.setdefault("download_url", url)
                base_metadata.setdefault("delivery_token", token)

        log = cls._create_delivery_log(
            report=report,
            channel=channel,
            recipient=phone,
            delivery_status=delivery_status,
            metadata=base_metadata,
            initiated_by=user,
            external_message_id=external_message_id,
            failure_reason=failure_reason,
        )

        now = timezone.now()
        if delivery_status == DeliveryStatus.SENT:
            cls._apply_log_status(log, DeliveryStatus.SENT, sent_at=now)
        elif delivery_status == DeliveryStatus.DELIVERED:
            cls._apply_log_status(
                log,
                DeliveryStatus.DELIVERED,
                sent_at=log.sent_at or now,
                delivered_at=now,
            )
        elif delivery_status == DeliveryStatus.VIEWED:
            cls._apply_log_status(log, DeliveryStatus.VIEWED, viewed_at=now)
        elif delivery_status == DeliveryStatus.FAILED:
            cls._apply_log_status(log, DeliveryStatus.FAILED, failure_reason=failure_reason or "")

        cls.sync_report_delivery_status(report=report)

        if delivery_status == DeliveryStatus.DELIVERED and report.status == ReportLifecycleStatus.READY:
            ReportWorkflowService.mark_delivered(report, user=user)

        return log

    @classmethod
    def sync_delivery_status_from_log(
        cls,
        report: DiagnosticTestReport,
        log: LabReportDeliveryLog | None = None,
    ) -> DiagnosticTestReport:
        """Deprecated path: always aggregate from all active logs."""
        return cls.sync_report_delivery_status(report=report)

    @classmethod
    @transaction.atomic
    def deliver_via_channel(
        cls,
        *,
        report: DiagnosticTestReport,
        channel: str,
        recipient: str,
        user=None,
    ) -> LabReportDeliveryLog:
        """Synchronous handoff: one log through prepare → sent → delivered."""
        log = cls.prepare_report_delivery(
            report=report,
            recipient_phone=recipient,
            initiated_by=user,
            channel=channel,
        )
        cls.mark_delivery_sent(delivery_log=log)
        return cls.mark_delivery_delivered(delivery_log=log, user=user)

    # ------------------------------------------------------------------ private helpers

    @staticmethod
    def _get_active_delivery_logs(report: DiagnosticTestReport):
        return report.delivery_logs.filter(is_deleted=False)

    @classmethod
    def _resolve_aggregate_delivery_status(cls, report: DiagnosticTestReport) -> str:
        qs = cls._get_active_delivery_logs(report)
        if not qs.exists():
            return DeliveryStatus.PENDING

        status_set = set(qs.values_list("delivery_status", flat=True))

        if DeliveryStatus.VIEWED in status_set:
            return DeliveryStatus.VIEWED
        if DeliveryStatus.DELIVERED in status_set:
            return DeliveryStatus.DELIVERED
        if DeliveryStatus.SENT in status_set:
            return DeliveryStatus.SENT
        if DeliveryStatus.FAILED in status_set:
            return DeliveryStatus.FAILED
        if DeliveryStatus.PENDING in status_set:
            return DeliveryStatus.PENDING
        return DeliveryStatus.PENDING

    @staticmethod
    def _build_delivery_download_url() -> tuple[str, str]:
        # Phase 2: replace placeholder token with expiring signed delivery token model.
        token = uuid.uuid4().hex
        base = settings.REPORT_PUBLIC_DOWNLOAD_BASE_URL.rstrip("/")
        return f"{base}/{token}", token

    @staticmethod
    def _create_delivery_log(
        *,
        report: DiagnosticTestReport,
        channel: str,
        recipient: str,
        delivery_status: str,
        metadata: dict | None = None,
        initiated_by=None,
        external_message_id: str | None = None,
        failure_reason: str | None = None,
        retry_count: int = 0,
    ) -> LabReportDeliveryLog:
        return LabReportDeliveryLog.objects.create(
            diagnostic_test_report=report,
            delivery_channel=channel,
            recipient=recipient,
            delivery_status=delivery_status,
            metadata=metadata or {},
            created_by=initiated_by,
            external_message_id=external_message_id,
            failure_reason=failure_reason,
            retry_count=retry_count,
        )

    @staticmethod
    def _apply_log_status(
        delivery_log: LabReportDeliveryLog,
        status: str,
        *,
        sent_at=None,
        delivered_at=None,
        viewed_at=None,
        external_message_id: str | None = None,
        failure_reason: str | None = None,
    ) -> None:
        now = timezone.now()
        delivery_log.delivery_status = status
        delivery_log.updated_at = now
        update_fields = ["delivery_status", "updated_at"]

        if sent_at is not None:
            delivery_log.sent_at = sent_at
            update_fields.append("sent_at")
        if delivered_at is not None:
            delivery_log.delivered_at = delivered_at
            update_fields.append("delivered_at")
        if viewed_at is not None:
            delivery_log.viewed_at = viewed_at
            update_fields.append("viewed_at")
        if external_message_id is not None:
            delivery_log.external_message_id = external_message_id
            update_fields.append("external_message_id")
        if failure_reason is not None:
            delivery_log.failure_reason = failure_reason
            update_fields.append("failure_reason")

        delivery_log.save(update_fields=update_fields)
