"""Timeline validator tests for Clinical Audit certification."""

from __future__ import annotations

import uuid

from django.test import TestCase

from clinical_audit.certification.constants import CERTIFICATION_REQUIRED_ACTIONS
from clinical_audit.certification.timeline_validator import TimelineValidator
from clinical_audit.domain.builders import ClinicalAuditBuilder
from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.domain.validators import AuditRequestValidator
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from tests.factories.clinic import ClinicFactory


class TimelineValidationTests(TestCase):
    def setUp(self) -> None:
        self.clinic = ClinicFactory()
        self.repository = ClinicalAuditRepository()
        self.validator = TimelineValidator()
        self.correlation_id = str(uuid.uuid4())
        self.consultation_id = str(uuid.uuid4())
        self.patient_id = str(uuid.uuid4())

    def _save(self, action: AuditAction, *, offset_ms: int = 0) -> None:
        from datetime import timedelta

        from django.utils import timezone

        validated = AuditRequestValidator.validate(
            action=action,
            event=action.label,
            resource_type=self._resource_type(action),
            resource_id=str(uuid.uuid4()),
            source=AuditSource.DOCTOR,
            user_id="USR-CERT",
            organization_id=str(self.clinic.id),
            patient_account_id=self.patient_id,
            consultation_id=self.consultation_id,
            correlation_id=self.correlation_id,
            payload={"step": str(action)},
            validate_references=False,
        )
        record = ClinicalAuditBuilder.build(validated)
        record.timestamp = timezone.now() + timedelta(milliseconds=offset_ms)
        self.repository.save(record)

    def _resource_type(self, action: AuditAction) -> ClinicalEntity:
        mapping = {
            AuditAction.CONSULTATION_STARTED: ClinicalEntity.CONSULTATION,
            AuditAction.CONSULTATION_COMPLETED: ClinicalEntity.CONSULTATION,
            AuditAction.SYMPTOMS_RECORDED: ClinicalEntity.SYMPTOMS,
            AuditAction.VITAL_SIGNS_RECORDED: ClinicalEntity.VITAL_SIGNS,
            AuditAction.DIAGNOSIS_ADDED: ClinicalEntity.DIAGNOSIS,
            AuditAction.PRESCRIPTION_CREATED: ClinicalEntity.PRESCRIPTION,
            AuditAction.PRESCRIPTION_SIGNED: ClinicalEntity.PRESCRIPTION,
            AuditAction.TEST_ORDERED: ClinicalEntity.DIAGNOSTIC_TEST,
            AuditAction.RECOMMENDATION_SENT: ClinicalEntity.RECOMMENDATION,
            AuditAction.REPORT_UPLOADED: ClinicalEntity.REPORT,
            AuditAction.REPORT_VIEWED: ClinicalEntity.REPORT,
            AuditAction.REPORT_DOWNLOADED: ClinicalEntity.REPORT,
            AuditAction.REPORT_SHARED: ClinicalEntity.REPORT,
        }
        return mapping[action]

    def _build_valid_timeline(self) -> list:
        production_order = [
            AuditAction.VITAL_SIGNS_RECORDED,
            AuditAction.CONSULTATION_STARTED,
            AuditAction.TEST_ORDERED,
            AuditAction.RECOMMENDATION_SENT,
            AuditAction.REPORT_UPLOADED,
            AuditAction.REPORT_VIEWED,
            AuditAction.REPORT_DOWNLOADED,
            AuditAction.REPORT_SHARED,
            AuditAction.SYMPTOMS_RECORDED,
            AuditAction.DIAGNOSIS_ADDED,
            AuditAction.PRESCRIPTION_CREATED,
            AuditAction.PRESCRIPTION_SIGNED,
            AuditAction.CONSULTATION_COMPLETED,
        ]
        for index, action in enumerate(production_order):
            self._save(action, offset_ms=index * 100)
        return list(
            __import__("clinical_audit.models", fromlist=["ClinicalAudit"]).ClinicalAudit.objects.filter(
                correlation_id=self.correlation_id
            )
        )

    def test_valid_timeline_passes(self) -> None:
        audits = self._build_valid_timeline()
        result = self.validator.validate(
            audits,
            consultation_id=self.consultation_id,
            patient_account_id=self.patient_id,
        )
        self.assertTrue(result.passed, result.errors)

    def test_missing_event_fails(self) -> None:
        for index, action in enumerate(CERTIFICATION_REQUIRED_ACTIONS[:-1]):
            self._save(action, offset_ms=index * 100)
        audits = list(
            __import__("clinical_audit.models", fromlist=["ClinicalAudit"]).ClinicalAudit.objects.filter(
                correlation_id=self.correlation_id
            )
        )
        result = self.validator.validate(audits)
        self.assertFalse(result.passed)
        self.assertTrue(any("Missing required event" in error for error in result.errors))

    def test_duplicate_event_fails(self) -> None:
        for index, action in enumerate(CERTIFICATION_REQUIRED_ACTIONS):
            self._save(action, offset_ms=index * 100)
        self._save(AuditAction.SYMPTOMS_RECORDED, offset_ms=9999)
        audits = list(
            __import__("clinical_audit.models", fromlist=["ClinicalAudit"]).ClinicalAudit.objects.filter(
                correlation_id=self.correlation_id
            )
        )
        result = self.validator.validate(audits)
        self.assertFalse(result.passed)
        self.assertTrue(any("Duplicate event" in error for error in result.errors))

    def test_invalid_ordering_fails(self) -> None:
        ordered = [
            AuditAction.CONSULTATION_STARTED,
            AuditAction.VITAL_SIGNS_RECORDED,
            AuditAction.TEST_ORDERED,
            AuditAction.RECOMMENDATION_SENT,
            AuditAction.REPORT_UPLOADED,
            AuditAction.REPORT_VIEWED,
            AuditAction.REPORT_DOWNLOADED,
            AuditAction.REPORT_SHARED,
            AuditAction.SYMPTOMS_RECORDED,
            AuditAction.DIAGNOSIS_ADDED,
            AuditAction.PRESCRIPTION_CREATED,
            AuditAction.PRESCRIPTION_SIGNED,
            AuditAction.CONSULTATION_COMPLETED,
        ]
        # Swap two mid-journey events to violate pairwise ordering.
        swapped = ordered.copy()
        swapped[8], swapped[9] = swapped[9], swapped[8]
        for index, action in enumerate(swapped):
            self._save(action, offset_ms=index * 100)
        audits = list(
            __import__("clinical_audit.models", fromlist=["ClinicalAudit"]).ClinicalAudit.objects.filter(
                correlation_id=self.correlation_id
            )
        )
        result = self.validator.validate(audits)
        self.assertFalse(result.passed)
        self.assertTrue(
            any("Invalid ordering" in error or "Invalid tier" in error for error in result.errors)
        )
