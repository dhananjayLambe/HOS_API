"""Unit tests for ClinicalAuditBuilder."""

from __future__ import annotations

import uuid

from django.test import TestCase

from clinical_audit.constants import META_KEY, META_ORGANIZATION_ID, META_REQUEST_ID, PAYLOAD_KEY
from clinical_audit.domain.builders import ClinicalAuditBuilder
from clinical_audit.domain.validators import AuditRequestValidator
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from shared.logging.context import LogContext, get_context_manager
from tests.factories.clinic import ClinicFactory


class ClinicalAuditBuilderTests(TestCase):
    def setUp(self) -> None:
        self.clinic = ClinicFactory()
        self.correlation_id = str(uuid.uuid4())
        get_context_manager().set(
            LogContext(
                correlation_id=self.correlation_id,
                request_id="req-123",
                user_id="CTX-USER",
                user_role="doctor",
                patient_account_id="PAT-ACC",
                consultation_id="CON-001",
                encounter_id="ENC-001",
            )
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    def _validated(self, **overrides):
        kwargs = {
            "action": AuditAction.CONSULTATION_STARTED,
            "event": "Consultation started",
            "resource_type": ClinicalEntity.CONSULTATION,
            "resource_id": str(uuid.uuid4()),
            "source": AuditSource.DOCTOR,
            "user_id": "USR-001",
            "organization_id": str(self.clinic.id),
            "payload": {"status": "started"},
            "validate_references": True,
        }
        kwargs.update(overrides)
        return AuditRequestValidator.validate(**kwargs)

    def test_builds_unsaved_instance_with_metadata_envelope(self) -> None:
        record = ClinicalAuditBuilder.build(self._validated())

        self.assertTrue(record._state.adding)
        self.assertEqual(record.correlation_id, self.correlation_id)
        self.assertEqual(record.user_id, "USR-001")
        self.assertEqual(record.patient_account_id, "PAT-ACC")
        self.assertEqual(record.consultation_id, "CON-001")
        self.assertEqual(record.encounter_id, "ENC-001")
        self.assertIn(META_KEY, record.new_value)
        self.assertEqual(
            record.new_value[META_KEY][META_ORGANIZATION_ID],
            str(self.clinic.id),
        )
        self.assertEqual(record.new_value[META_KEY][META_REQUEST_ID], "req-123")
        self.assertEqual(record.new_value[PAYLOAD_KEY], {"status": "started"})

    def test_generates_correlation_id_when_missing(self) -> None:
        get_context_manager().clear()
        validated = self._validated(correlation_id=None)
        record = ClinicalAuditBuilder.build(validated)
        self.assertTrue(record.correlation_id)

    def test_snapshot_maps_to_previous_value(self) -> None:
        record = ClinicalAuditBuilder.build(
            self._validated(snapshot={"status": "draft"})
        )
        self.assertEqual(record.previous_value, {"status": "draft"})
