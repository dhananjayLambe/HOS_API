"""Unit tests for Business Audit immutability guarantees."""

from __future__ import annotations

from django.test import TestCase

from business_audit.enums import BusinessAuditAction
from business_audit.exceptions import BusinessAuditImmutabilityError
from business_audit.models import BusinessAudit
from business_audit.tests.support import setup_business_audit_context


class BusinessAuditImmutabilityTests(TestCase):
    def setUp(self) -> None:
        self.clinic, self.correlation_id, self.workflow_instance_id = (
            setup_business_audit_context()
        )

    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def _create_audit(self) -> BusinessAudit:
        return BusinessAudit.objects.create(
            correlation_id=self.correlation_id,
            workflow_type="Notification",
            workflow_instance_id=self.workflow_instance_id,
            sequence_no=1,
            category="Notification",
            action=BusinessAuditAction.WORKFLOW_STARTED,
            event="Workflow started",
            domain="notifications",
            service="WhatsAppService",
            operation="send_message",
            resource_type="Message",
            resource_id="MSG-001",
            actor_type="System",
            organization_id=str(self.clinic.id),
            status="Started",
            outcome="Unknown",
        )

    def test_save_blocks_updates(self) -> None:
        audit = self._create_audit()
        audit.event = "Workflow completed"
        with self.assertRaises(BusinessAuditImmutabilityError):
            audit.save()

    def test_delete_blocked_on_instance(self) -> None:
        audit = self._create_audit()
        with self.assertRaises(BusinessAuditImmutabilityError):
            audit.delete()
        self.assertTrue(BusinessAudit.objects.filter(pk=audit.pk).exists())

    def test_queryset_update_blocked(self) -> None:
        audit = self._create_audit()
        with self.assertRaises(BusinessAuditImmutabilityError):
            BusinessAudit.objects.filter(pk=audit.pk).update(event="mutated")

    def test_queryset_delete_blocked(self) -> None:
        audit = self._create_audit()
        with self.assertRaises(BusinessAuditImmutabilityError):
            BusinessAudit.objects.filter(pk=audit.pk).delete()
        self.assertTrue(BusinessAudit.objects.filter(pk=audit.pk).exists())
