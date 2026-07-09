"""Unit tests for Clinical Audit immutability guarantees."""

from __future__ import annotations

from django.test import TestCase

from clinical_audit.enums import AuditAction
from clinical_audit.exceptions import ClinicalAuditImmutabilityError
from clinical_audit.models import ClinicalAudit


def _create_audit() -> ClinicalAudit:
    return ClinicalAudit.objects.create(
        correlation_id="550e8400-e29b-41d4-a716-446655440000",
        module="consultation",
        event="Consultation started",
        action=AuditAction.CONSULTATION_STARTED,
    )


class ClinicalAuditImmutabilityTests(TestCase):
    def test_save_blocks_updates(self) -> None:
        audit = _create_audit()
        audit.event = "Consultation completed"
        with self.assertRaises(ClinicalAuditImmutabilityError):
            audit.save()

    def test_delete_blocked_on_instance(self) -> None:
        audit = _create_audit()
        with self.assertRaises(ClinicalAuditImmutabilityError):
            audit.delete()
        self.assertTrue(ClinicalAudit.objects.filter(pk=audit.pk).exists())

    def test_queryset_update_blocked(self) -> None:
        audit = _create_audit()
        with self.assertRaises(ClinicalAuditImmutabilityError):
            ClinicalAudit.objects.filter(pk=audit.pk).update(event="mutated")

    def test_queryset_delete_blocked(self) -> None:
        audit = _create_audit()
        with self.assertRaises(ClinicalAuditImmutabilityError):
            ClinicalAudit.objects.filter(pk=audit.pk).delete()
        self.assertTrue(ClinicalAudit.objects.filter(pk=audit.pk).exists())
