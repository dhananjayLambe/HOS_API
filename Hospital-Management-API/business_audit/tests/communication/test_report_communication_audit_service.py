"""Unit tests for ReportCommunicationAuditService."""

from __future__ import annotations

from django.test import TestCase

from business_audit.communication.constants import (
    COMM_STATE_DELIVERED,
    COMM_STATE_FAILED,
    COMM_STATE_PUBLISHED,
    COMM_STATE_QUEUED,
    COMM_STATE_READY,
    COMM_STATE_RETRY,
)
from business_audit.communication.report.report_communication_audit_service import (
    ReportCommunicationAuditService,
)
from business_audit.enums import (
    BusinessAuditAction,
    BusinessResourceType,
    WorkflowOutcome,
    WorkflowType,
)
from business_audit.models import BusinessAudit
from business_audit.tests.communication.support import communication_context_stub
from shared.logging.context import get_context_manager


class ReportCommunicationAuditServiceTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def _ids(self):
        return communication_context_stub()

    def test_emit_report_ready_fsm(self) -> None:
        ctx, org_id = self._ids()
        result = ReportCommunicationAuditService.emit_report_ready(ctx=ctx, organization_id=org_id)
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.REPORT_READY)
        self.assertEqual(audit.workflow_type, WorkflowType.REPORT_DELIVERY)
        self.assertEqual(audit.resource_type, BusinessResourceType.COMMUNICATION)
        self.assertEqual(audit.resource_id, ctx.communication_id)
        self.assertIsNone(audit.state_before)
        self.assertEqual(audit.state_after, COMM_STATE_READY)

    def test_emit_report_ready_idempotent(self) -> None:
        ctx, org_id = self._ids()
        first = ReportCommunicationAuditService.emit_report_ready(ctx=ctx, organization_id=org_id)
        second = ReportCommunicationAuditService.emit_report_ready(ctx=ctx, organization_id=org_id)
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_delivery_requested_fsm(self) -> None:
        ctx, org_id = self._ids()
        ReportCommunicationAuditService.emit_report_ready(ctx=ctx, organization_id=org_id)
        result = ReportCommunicationAuditService.emit_delivery_requested(
            ctx=ctx,
            channel="WHATSAPP",
            queue_wait_ms=50,
            organization_id=org_id,
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.REPORT_DELIVERY_REQUESTED)
        self.assertEqual(audit.state_before, COMM_STATE_READY)
        self.assertEqual(audit.state_after, COMM_STATE_QUEUED)
        self.assertEqual(audit.workflow_instance_id, ctx.communication_attempt_id)

    def test_whatsapp_delivery_with_snapshots(self) -> None:
        ctx, org_id = self._ids()
        ReportCommunicationAuditService.emit_report_ready(ctx=ctx, organization_id=org_id)
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=ctx, channel="WHATSAPP", organization_id=org_id
        )
        result = ReportCommunicationAuditService.emit_whatsapp_delivery(
            ctx=ctx,
            provider_reference="wamid.abc",
            organization_id=org_id,
            provider_latency_ms=120,
            total_delivery_ms=200,
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.REPORT_WHATSAPP_DELIVERY)
        self.assertEqual(audit.state_after, COMM_STATE_DELIVERED)
        self.assertEqual(audit.outcome, WorkflowOutcome.SUCCESS)
        payload = audit.new_value["payload"]
        self.assertIn("decision_snapshot", payload)
        self.assertIn("provider_response_snapshot", payload)

    def test_channel_delivery_idempotent_by_provider_reference(self) -> None:
        ctx, org_id = self._ids()
        ReportCommunicationAuditService.emit_report_ready(ctx=ctx, organization_id=org_id)
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=ctx, channel="WHATSAPP", organization_id=org_id
        )
        first = ReportCommunicationAuditService.emit_whatsapp_delivery(
            ctx=ctx,
            provider_reference="dup-ref",
            organization_id=org_id,
        )
        second = ReportCommunicationAuditService.emit_whatsapp_delivery(
            ctx=ctx,
            provider_reference="dup-ref",
            organization_id=org_id,
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_delivery_failed_fsm(self) -> None:
        ctx, org_id = self._ids()
        ReportCommunicationAuditService.emit_report_ready(ctx=ctx, organization_id=org_id)
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=ctx, channel="WHATSAPP", organization_id=org_id
        )
        result = ReportCommunicationAuditService.emit_delivery_failed(
            ctx=ctx,
            channel="WHATSAPP",
            reason="provider_timeout",
            organization_id=org_id,
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.REPORT_DELIVERY_FAILED)
        self.assertEqual(audit.state_after, COMM_STATE_FAILED)
        self.assertIn("provider_response_snapshot", audit.new_value["payload"])

    def test_delivery_retried_fsm(self) -> None:
        ctx, org_id = communication_context_stub(attempt_number=2)
        parent_id = str(ctx.communication_attempt_id)
        result = ReportCommunicationAuditService.emit_delivery_retried(
            ctx=ctx,
            previous_channel="WHATSAPP",
            new_channel="EMAIL",
            previous_error="timeout",
            parent_attempt_id=parent_id,
            organization_id=org_id,
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.REPORT_DELIVERY_RETRIED)
        self.assertEqual(audit.state_after, COMM_STATE_RETRY)
        self.assertIn("channel_selection_snapshot", audit.new_value["payload"])

    def test_portal_delivery(self) -> None:
        ctx, org_id = self._ids()
        ReportCommunicationAuditService.emit_report_ready(ctx=ctx, organization_id=org_id)
        result = ReportCommunicationAuditService.emit_portal_delivery(ctx=ctx, organization_id=org_id)
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.REPORT_PORTAL_DELIVERY)
        self.assertEqual(audit.state_after, COMM_STATE_PUBLISHED)

    def test_email_and_sms_delivery_actions(self) -> None:
        ctx, org_id = self._ids()
        ReportCommunicationAuditService.emit_report_ready(ctx=ctx, organization_id=org_id)
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=ctx, channel="EMAIL", organization_id=org_id
        )
        email = ReportCommunicationAuditService.emit_email_delivery(
            ctx=ctx, provider_reference="email-1", organization_id=org_id
        )
        self.assertTrue(email.success)
        self.assertEqual(
            BusinessAudit.objects.get(pk=email.audit_id).action,
            BusinessAuditAction.REPORT_EMAIL_DELIVERY,
        )

        ctx2, org_id2 = communication_context_stub()
        ReportCommunicationAuditService.emit_report_ready(ctx=ctx2, organization_id=org_id)
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=ctx2, channel="SMS", organization_id=org_id2
        )
        sms = ReportCommunicationAuditService.emit_sms_delivery(
            ctx=ctx2, provider_reference="sms-1", organization_id=org_id2
        )
        self.assertTrue(sms.success)
        self.assertEqual(
            BusinessAudit.objects.get(pk=sms.audit_id).action,
            BusinessAuditAction.REPORT_SMS_DELIVERY,
        )
