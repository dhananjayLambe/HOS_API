"""Tests for communication webhook extension point stub."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.communication.report.hooks import schedule_communication_webhook_received
from business_audit.communication.report.report_communication_audit_service import (
    ReportCommunicationAuditService,
)
from business_audit.enums import BusinessAuditAction
from business_audit.models import BusinessAudit
from shared.logging.context import get_context_manager
from tests.factories.clinic import ClinicFactory


class WebhookStubTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_emit_webhook_received(self) -> None:
        clinic = ClinicFactory()
        comm_id = str(uuid.uuid4())
        attempt_id = str(uuid.uuid4())
        with self.captureOnCommitCallbacks(execute=True):
            schedule_communication_webhook_received(
                communication_id=comm_id,
                communication_attempt_id=attempt_id,
                provider="META",
                provider_reference="wamid.123",
                webhook_event_type="message.read",
                new_status="READ",
                organization_id=str(clinic.id),
            )

        rows = BusinessAudit.objects.filter(action=BusinessAuditAction.COMMUNICATION_WEBHOOK_RECEIVED)
        self.assertEqual(rows.count(), 1)
        audit = rows.first()
        self.assertEqual(audit.state_after, "READ")
        payload = audit.new_value["payload"]
        self.assertEqual(payload["webhook_event_type"], "message.read")

    def test_webhook_idempotent(self) -> None:
        clinic = ClinicFactory()
        comm_id = str(uuid.uuid4())
        attempt_id = str(uuid.uuid4())
        kwargs = dict(
            communication_id=comm_id,
            communication_attempt_id=attempt_id,
            provider="META",
            provider_reference="wamid.dup",
            webhook_event_type="message.delivered",
            new_status="DELIVERED",
            organization_id=str(clinic.id),
        )
        first = ReportCommunicationAuditService.emit_webhook_received(**kwargs)
        second = ReportCommunicationAuditService.emit_webhook_received(**kwargs)
        self.assertTrue(first.success)
        self.assertIsNone(second)
