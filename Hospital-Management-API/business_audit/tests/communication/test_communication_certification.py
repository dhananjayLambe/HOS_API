"""Tests for CommunicationCertificationService."""

from __future__ import annotations

from django.test import TestCase

from business_audit.communication.certification.communication_certification_service import (
    CommunicationCertificationService,
)
from business_audit.communication.report.report_communication_audit_service import (
    ReportCommunicationAuditService,
)
from business_audit.tests.communication.support import communication_context_stub


class CommunicationCertificationTests(TestCase):
    def setUp(self) -> None:
        self.service = CommunicationCertificationService()
        self.ctx, self.org_id = communication_context_stub()

    def _emit_complete_success(self) -> None:
        ReportCommunicationAuditService.emit_report_ready(
            ctx=self.ctx, organization_id=self.org_id
        )
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=self.ctx, channel="WHATSAPP", organization_id=self.org_id
        )
        ReportCommunicationAuditService.emit_whatsapp_delivery(
            ctx=self.ctx,
            provider_reference="ref-cert",
            organization_id=self.org_id,
        )

    def test_certify_success_journey_passes(self) -> None:
        self._emit_complete_success()
        report = self.service.certify(communication_id=self.ctx.communication_id)
        self.assertTrue(report.passed)
        self.assertEqual(report.event_count, 3)
        self.assertEqual(len(report.errors), 0)

    def test_certify_missing_ready_fails(self) -> None:
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=self.ctx, channel="WHATSAPP", organization_id=self.org_id
        )
        report = self.service.certify(communication_id=self.ctx.communication_id)
        self.assertFalse(report.passed)
        self.assertTrue(any("report.ready" in e for e in report.errors))

    def test_certify_missing_decision_snapshot_fails(self) -> None:
        ReportCommunicationAuditService.emit_report_ready(
            ctx=self.ctx, organization_id=self.org_id
        )
        ReportCommunicationAuditService.emit_delivery_requested(
            ctx=self.ctx, channel="WHATSAPP", organization_id=self.org_id
        )
        ReportCommunicationAuditService.emit_delivery_failed(
            ctx=self.ctx, channel="WHATSAPP", reason="x", organization_id=self.org_id
        )
        report = self.service.certify(communication_id=self.ctx.communication_id)
        self.assertTrue(report.passed)

    def test_certify_retry_includes_retried_event(self) -> None:
        self._emit_complete_success()
        ctx2, org_id2 = communication_context_stub(attempt_number=2)
        ctx2.communication_id = self.ctx.communication_id
        ReportCommunicationAuditService.emit_delivery_retried(
            ctx=ctx2,
            previous_channel="WHATSAPP",
            new_channel="EMAIL",
            previous_error="timeout",
            parent_attempt_id=self.ctx.communication_attempt_id,
            organization_id=org_id2,
        )
        report = self.service.certify(communication_id=self.ctx.communication_id)
        self.assertTrue(report.passed)
        actions = [e["action"] for e in report.timeline]
        self.assertIn("report.delivery_retried", actions)
