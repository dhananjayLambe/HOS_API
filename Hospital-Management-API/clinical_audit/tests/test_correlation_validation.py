"""Correlation validator tests for Clinical Audit certification."""

from __future__ import annotations

import uuid

from django.test import TestCase

from clinical_audit.certification.correlation_validator import CorrelationValidator
from clinical_audit.domain.builders import ClinicalAuditBuilder
from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.domain.validators import AuditRequestValidator
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from tests.factories.clinic import ClinicFactory


class CorrelationValidationTests(TestCase):
    def setUp(self) -> None:
        self.clinic = ClinicFactory()
        self.repository = ClinicalAuditRepository()
        self.validator = CorrelationValidator()

    def _save(self, *, correlation_id: str) -> None:
        validated = AuditRequestValidator.validate(
            action=AuditAction.CONSULTATION_STARTED,
            event=AuditAction.CONSULTATION_STARTED.label,
            resource_type=ClinicalEntity.CONSULTATION,
            resource_id=str(uuid.uuid4()),
            source=AuditSource.DOCTOR,
            user_id="USR-CERT",
            organization_id=str(self.clinic.id),
            correlation_id=correlation_id,
            validate_references=False,
        )
        self.repository.save(ClinicalAuditBuilder.build(validated))

    def test_single_correlation_passes(self) -> None:
        correlation_id = str(uuid.uuid4())
        self._save(correlation_id=correlation_id)
        audits = list(
            __import__("clinical_audit.models", fromlist=["ClinicalAudit"]).ClinicalAudit.objects.all()
        )
        result = self.validator.validate(audits, expected_correlation_id=correlation_id)
        self.assertTrue(result.passed, result.errors)

    def test_mixed_correlation_ids_fail(self) -> None:
        self._save(correlation_id=str(uuid.uuid4()))
        self._save(correlation_id=str(uuid.uuid4()))
        audits = list(
            __import__("clinical_audit.models", fromlist=["ClinicalAudit"]).ClinicalAudit.objects.all()
        )
        result = self.validator.validate(audits)
        self.assertFalse(result.passed)
        self.assertTrue(any("Multiple correlation IDs" in error for error in result.errors))
