"""Integration tests for report communication audit hooks."""

from __future__ import annotations

from django.test import TestCase, override_settings

from business_audit.communication.context import ensure_communication_attempt_metadata
from business_audit.communication.report.hooks import (
    schedule_channel_delivery_success,
    schedule_delivery_failed,
    schedule_delivery_requested,
    schedule_delivery_retried,
    schedule_report_ready,
)
from business_audit.communication.report.repository import ReportCommunicationAuditRepository
from business_audit.enums import BusinessAuditAction, BusinessResourceType
from business_audit.models import BusinessAudit
from business_audit.tests.communication.support import (
    DOWNLOAD_BASE,
    create_ready_report_for_booking,
    setup_booking_context,
)
from diagnostics_engine.services.reports import ReportDeliveryService
from labs.choices.tracking import DeliveryStatus
from shared.logging.context import get_context_manager


@override_settings(REPORT_PUBLIC_DOWNLOAD_BASE_URL=DOWNLOAD_BASE)
class ReportCommunicationIntegrationTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_mark_ready_emits_report_ready(self) -> None:
        ctx = setup_booking_context()
        report, _order = create_ready_report_for_booking(ctx)
        rows = ReportCommunicationAuditRepository().get_by_communication(str(report.pk))
        self.assertTrue(any(r.action == BusinessAuditAction.REPORT_READY for r in rows))
        ready = [r for r in rows if r.action == BusinessAuditAction.REPORT_READY][0]
        self.assertEqual(ready.resource_type, BusinessResourceType.COMMUNICATION)
        self.assertEqual(ready.resource_id, str(report.pk))

    def test_prepare_to_deliver_success_chain(self) -> None:
        ctx = setup_booking_context()
        report, order = create_ready_report_for_booking(ctx)
        org_id = str(ctx["clinic"].id)

        with self.captureOnCommitCallbacks(execute=True):
            log = ReportDeliveryService.prepare_report_delivery(
                report=report,
                recipient_phone="9999999999",
                initiated_by=ctx["doctor_user"],
            )
            runtime = getattr(log, "_communication_runtime", None)
            schedule_channel_delivery_success(
                report=report,
                delivery_log=log,
                runtime=runtime,
                external_message_id="msg-success",
            )

        rows = ReportCommunicationAuditRepository().get_by_communication(str(report.pk))
        actions = [r.action for r in rows]
        self.assertIn(BusinessAuditAction.REPORT_READY, actions)
        self.assertIn(BusinessAuditAction.REPORT_DELIVERY_REQUESTED, actions)
        self.assertIn(BusinessAuditAction.REPORT_WHATSAPP_DELIVERY, actions)
        log.refresh_from_db()
        self.assertEqual(log.metadata.get("communication_id"), str(report.pk))
        self.assertEqual(log.metadata.get("communication_attempt_id"), str(log.pk))

    def test_delivery_failed_emits_failure_audit(self) -> None:
        ctx = setup_booking_context()
        report, _order = create_ready_report_for_booking(ctx)

        with self.captureOnCommitCallbacks(execute=True):
            log = ReportDeliveryService.prepare_report_delivery(
                report=report,
                recipient_phone="9999999999",
                initiated_by=ctx["doctor_user"],
            )
            ReportDeliveryService.mark_delivery_failed(delivery_log=log, reason="timeout")

        rows = ReportCommunicationAuditRepository().get_by_attempt(str(log.pk))
        self.assertTrue(
            any(r.action == BusinessAuditAction.REPORT_DELIVERY_FAILED for r in rows)
        )
        failed = [r for r in rows if r.action == BusinessAuditAction.REPORT_DELIVERY_FAILED][0]
        self.assertIn("provider_response_snapshot", failed.new_value["payload"])

    def test_retry_emits_retried_and_new_attempt(self) -> None:
        ctx = setup_booking_context()
        report, _order = create_ready_report_for_booking(ctx)

        with self.captureOnCommitCallbacks(execute=True):
            parent = ReportDeliveryService.prepare_report_delivery(
                report=report,
                recipient_phone="9999999999",
                initiated_by=ctx["doctor_user"],
            )
            parent.delivery_status = DeliveryStatus.FAILED
            parent.failure_reason = "timeout"
            parent.save(update_fields=["delivery_status", "failure_reason", "updated_at"])
            new_log = ReportDeliveryService.retry_delivery(
                delivery_log=parent,
                initiated_by=ctx["doctor_user"],
            )

        rows = ReportCommunicationAuditRepository().get_by_communication(str(report.pk))
        self.assertTrue(
            any(r.action == BusinessAuditAction.REPORT_DELIVERY_RETRIED for r in rows)
        )
        new_log.refresh_from_db()
        self.assertEqual(new_log.retry_count, 1)
        self.assertEqual(new_log.metadata.get("attempt_number"), 2)

    def test_workflow_hierarchy_in_payload(self) -> None:
        ctx = setup_booking_context()
        report, order = create_ready_report_for_booking(ctx)

        with self.captureOnCommitCallbacks(execute=True):
            schedule_report_ready(report=report, user=ctx["doctor_user"])
            log = ReportDeliveryService.prepare_report_delivery(
                report=report,
                recipient_phone="9999999999",
            )
            ensure_communication_attempt_metadata(log, report=report)
            schedule_delivery_requested(report=report, delivery_log=log)

        ready = BusinessAudit.objects.filter(
            resource_id=str(report.pk),
            action=BusinessAuditAction.REPORT_READY,
        ).first()
        payload = ready.new_value["payload"]
        self.assertEqual(payload["booking_id"], str(order.pk))
        self.assertIsNotNone(payload.get("patient_account_id"))
