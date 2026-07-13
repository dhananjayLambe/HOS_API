"""Unit tests for ReportCommunicationAuditRepository."""

from __future__ import annotations

from django.test import TestCase

from business_audit.communication.report.repository import ReportCommunicationAuditRepository
from business_audit.communication.report.report_communication_audit_service import (
    ReportCommunicationAuditService,
)
from business_audit.enums import BusinessAuditAction
from business_audit.tests.communication.support import communication_context_stub


class ReportCommunicationRepositoryTests(TestCase):
    def setUp(self) -> None:
        self.repo = ReportCommunicationAuditRepository()
        self.ctx, self.org_id = communication_context_stub()

    def _emit_success_journey(self) -> None:
        ReportCommunicationAuditService.emit_report_ready(
            ctx=self.ctx, organization_id=self.org_id
        )
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=self.ctx, channel="WHATSAPP", organization_id=self.org_id
        )
        ReportCommunicationAuditService.emit_whatsapp_delivery(
            ctx=self.ctx,
            provider_reference="ref-1",
            organization_id=self.org_id,
        )

    def test_get_by_communication(self) -> None:
        self._emit_success_journey()
        rows = self.repo.get_by_communication(self.ctx.communication_id)
        self.assertEqual(len(rows), 3)

    def test_get_by_attempt(self) -> None:
        self._emit_success_journey()
        rows = self.repo.get_by_attempt(self.ctx.communication_attempt_id)
        self.assertEqual(len(rows), 2)

    def test_get_by_provider_reference(self) -> None:
        self._emit_success_journey()
        rows = self.repo.get_by_provider_reference("ref-1")
        self.assertEqual(len(rows), 1)

    def test_get_by_channel(self) -> None:
        self._emit_success_journey()
        rows = self.repo.get_by_channel("WHATSAPP")
        self.assertTrue(any(r.action == BusinessAuditAction.REPORT_WHATSAPP_DELIVERY for r in rows))

    def test_reconstruct_attempt_timeline(self) -> None:
        self._emit_success_journey()
        timeline = self.repo.reconstruct_attempt_timeline(self.ctx.communication_id)
        self.assertEqual(len(timeline), 1)
        self.assertEqual(timeline[0]["channel"], "WHATSAPP")
        self.assertEqual(timeline[0]["status"], "DELIVERED")

    def test_get_failed_communications(self) -> None:
        ReportCommunicationAuditService.emit_report_ready(
            ctx=self.ctx, organization_id=self.org_id
        )
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=self.ctx, channel="WHATSAPP", organization_id=self.org_id
        )
        ReportCommunicationAuditService.emit_delivery_failed(
            ctx=self.ctx, channel="WHATSAPP", reason="fail", organization_id=self.org_id
        )
        rows = self.repo.get_failed_communications()
        self.assertEqual(len(rows), 1)

    def test_get_retry_communications(self) -> None:
        ctx, org_id = communication_context_stub(attempt_number=2)
        ctx.communication_id = self.ctx.communication_id
        ReportCommunicationAuditService.emit_delivery_retried(
            ctx=ctx,
            previous_channel="WHATSAPP",
            new_channel="EMAIL",
            previous_error="timeout",
            parent_attempt_id=self.ctx.communication_attempt_id,
            organization_id=org_id,
        )
        rows = self.repo.get_retry_communications()
        self.assertEqual(len(rows), 1)

    def test_has_action_guards(self) -> None:
        self._emit_success_journey()
        self.assertTrue(
            self.repo.has_action_for_communication(
                communication_id=self.ctx.communication_id,
                action=BusinessAuditAction.REPORT_READY,
            )
        )
        self.assertTrue(
            self.repo.has_action_for_attempt(
                communication_attempt_id=self.ctx.communication_attempt_id,
                action=BusinessAuditAction.REPORT_DELIVERY_REQUESTED,
            )
        )
