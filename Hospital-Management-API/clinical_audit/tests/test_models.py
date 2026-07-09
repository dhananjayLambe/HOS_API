"""Unit tests for ClinicalAudit model schema and constraints."""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.test import TestCase

from clinical_audit.constants import (
    INDEX_ACTION_TIMESTAMP,
    INDEX_CONSULTATION_TIMESTAMP,
    INDEX_CORRELATION_TIMESTAMP,
    INDEX_ENCOUNTER_TIMESTAMP,
    INDEX_PATIENT_ACCOUNT_TIMESTAMP,
    INDEX_RESOURCE,
    INDEX_TIMESTAMP,
    INDEX_USER_TIMESTAMP,
)
from clinical_audit.enums import AuditAction, AuditOutcome, AuditSource, ClinicalEntity
from clinical_audit.exceptions import ClinicalAuditError
from clinical_audit.models import ClinicalAudit


def _create_audit(**overrides) -> ClinicalAudit:
    payload = {
        "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
        "module": "consultation",
        "event": "Consultation started",
        "action": AuditAction.CONSULTATION_STARTED,
        "user_id": "USR-001",
        "user_role": "doctor",
        "patient_account_id": "PAT-001",
        "consultation_id": "CON-001",
        "encounter_id": "ENC-001",
        "resource_type": ClinicalEntity.CONSULTATION,
        "resource_id": "CON-001",
        "source": AuditSource.DOCTOR,
    }
    payload.update(overrides)
    return ClinicalAudit.objects.create(**payload)


class ClinicalAuditModelTests(TestCase):
    def test_create_persists_required_and_optional_fields(self) -> None:
        audit = _create_audit(
            previous_value={"status": "draft"},
            new_value={"status": "started"},
            remarks="Started by attending physician",
        )

        audit.refresh_from_db()
        self.assertEqual(audit.correlation_id, "550e8400-e29b-41d4-a716-446655440000")
        self.assertEqual(audit.action, AuditAction.CONSULTATION_STARTED)
        self.assertEqual(audit.outcome, AuditOutcome.SUCCESS)
        self.assertEqual(audit.resource_type, ClinicalEntity.CONSULTATION)
        self.assertEqual(audit.previous_value, {"status": "draft"})
        self.assertEqual(audit.new_value, {"status": "started"})
        self.assertIsNotNone(audit.timestamp)
        self.assertIsNotNone(audit.id)

    def test_correlation_id_required(self) -> None:
        with self.assertRaises(ClinicalAuditError):
            ClinicalAudit.objects.create(
                correlation_id="",
                module="consultation",
                event="Consultation started",
                action=AuditAction.CONSULTATION_STARTED,
            )

    def test_invalid_action_rejected_by_full_clean(self) -> None:
        audit = ClinicalAudit(
            correlation_id="550e8400-e29b-41d4-a716-446655440000",
            module="consultation",
            event="Invalid",
            action="not.a.valid.action",
        )
        with self.assertRaises(ValidationError):
            audit.full_clean()

    def test_enum_choices_cover_architecture_actions(self) -> None:
        required_actions = {
            "authentication.login",
            "patient.record_viewed",
            "consultation.started",
            "consultation.completed",
            "diagnosis.added",
            "prescription.generated",
            "report.uploaded",
            "follow_up.scheduled",
        }
        self.assertTrue(required_actions.issubset(set(AuditAction.values)))

    def test_meta_indexes_match_investigation_strategy(self) -> None:
        index_names = {index.name for index in ClinicalAudit._meta.indexes}
        self.assertEqual(
            index_names,
            {
                INDEX_CORRELATION_TIMESTAMP,
                INDEX_PATIENT_ACCOUNT_TIMESTAMP,
                INDEX_CONSULTATION_TIMESTAMP,
                INDEX_ENCOUNTER_TIMESTAMP,
                INDEX_USER_TIMESTAMP,
                INDEX_RESOURCE,
                INDEX_ACTION_TIMESTAMP,
                INDEX_TIMESTAMP,
            },
        )

    def test_db_table_name(self) -> None:
        self.assertEqual(ClinicalAudit._meta.db_table, "clinical_audit")
