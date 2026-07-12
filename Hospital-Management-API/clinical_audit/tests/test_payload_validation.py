"""Payload validator tests for Clinical Audit certification."""

from __future__ import annotations

import uuid

from django.test import TestCase

from clinical_audit.certification.payload_validator import PayloadValidator
from clinical_audit.domain.builders import ClinicalAuditBuilder
from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.domain.validators import AuditRequestValidator
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from tests.factories.clinic import ClinicFactory


class PayloadValidationTests(TestCase):
    def setUp(self) -> None:
        self.clinic = ClinicFactory()
        self.repository = ClinicalAuditRepository()
        self.validator = PayloadValidator()

    def _save(self, *, payload: dict | None = None, snapshot: dict | None = None, action=None):
        action = action or AuditAction.REPORT_VIEWED
        validated = AuditRequestValidator.validate(
            action=action,
            event=action.label,
            resource_type=ClinicalEntity.REPORT,
            resource_id=str(uuid.uuid4()),
            source=AuditSource.DOCTOR,
            user_id="USR-CERT",
            organization_id=str(self.clinic.id),
            patient_account_id=str(uuid.uuid4()),
            consultation_id=str(uuid.uuid4()),
            correlation_id=str(uuid.uuid4()),
            payload=payload or {"viewer": "doctor"},
            snapshot=snapshot,
            validate_references=False,
        )
        return self.repository.save(ClinicalAuditBuilder.build(validated))

    def test_clean_payload_passes(self) -> None:
        audit = self._save(payload={"viewer": "doctor"})
        result = self.validator.validate([audit])
        self.assertTrue(result.passed, result.errors)

    def test_forbidden_key_fails(self) -> None:
        audit = self._save(payload={"password": "secret"})
        result = self.validator.validate([audit])
        self.assertFalse(result.passed)
        self.assertTrue(any("forbidden key" in error.lower() for error in result.errors))

    def test_snapshot_forbidden_for_report_viewed(self) -> None:
        audit = self._save(snapshot={"status": "ready"})
        result = self.validator.validate([audit])
        self.assertFalse(result.passed)
        self.assertTrue(any("snapshot forbidden" in error for error in result.errors))

    def test_snapshot_required_for_diagnosis_updated(self) -> None:
        validated = AuditRequestValidator.validate(
            action=AuditAction.DIAGNOSIS_UPDATED,
            event=AuditAction.DIAGNOSIS_UPDATED.label,
            resource_type=ClinicalEntity.DIAGNOSIS,
            resource_id=str(uuid.uuid4()),
            source=AuditSource.DOCTOR,
            user_id="USR-CERT",
            organization_id=str(self.clinic.id),
            patient_account_id=str(uuid.uuid4()),
            consultation_id=str(uuid.uuid4()),
            correlation_id=str(uuid.uuid4()),
            payload={"changed_fields": ["severity"]},
            snapshot=None,
            validate_references=False,
        )
        audit = self.repository.save(ClinicalAuditBuilder.build(validated))
        result = self.validator.validate([audit])
        self.assertFalse(result.passed)
        self.assertTrue(any("snapshot required" in error for error in result.errors))
