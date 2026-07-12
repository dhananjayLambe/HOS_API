"""Unit tests for ClinicalAuditRepository."""

from __future__ import annotations

import uuid

from django.test import TestCase

from clinical_audit.domain.builders import ClinicalAuditBuilder
from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.domain.validators import AuditRequestValidator
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from clinical_audit.exceptions import ClinicalAuditImmutabilityError
from clinical_audit.models import ClinicalAudit
from tests.factories.clinic import ClinicFactory


class ClinicalAuditRepositoryTests(TestCase):
    def setUp(self) -> None:
        self.clinic = ClinicFactory()
        self.repository = ClinicalAuditRepository()
        self.correlation_id = str(uuid.uuid4())
        self.resource_id = str(uuid.uuid4())

    def _create_record(self, **overrides) -> ClinicalAudit:
        kwargs = {
            "action": AuditAction.CONSULTATION_STARTED,
            "event": "Consultation started",
            "resource_type": ClinicalEntity.CONSULTATION,
            "resource_id": self.resource_id,
            "source": AuditSource.DOCTOR,
            "user_id": "USR-001",
            "organization_id": str(self.clinic.id),
            "correlation_id": self.correlation_id,
            "validate_references": True,
        }
        kwargs.update(overrides)
        validated = AuditRequestValidator.validate(**kwargs)
        record = ClinicalAuditBuilder.build(validated)
        return self.repository.save(record)

    def test_save_persists_record(self) -> None:
        saved = self._create_record()
        self.assertIsNotNone(saved.id)
        self.assertEqual(
            ClinicalAudit.objects.filter(pk=saved.id).count(),
            1,
        )

    def test_bulk_save_persists_multiple_records(self) -> None:
        first = ClinicalAuditBuilder.build(
            AuditRequestValidator.validate(
                action=AuditAction.CONSULTATION_STARTED,
                event="First",
                resource_type=ClinicalEntity.CONSULTATION,
                resource_id=str(uuid.uuid4()),
                source=AuditSource.DOCTOR,
                user_id="USR-001",
                organization_id=str(self.clinic.id),
                correlation_id=self.correlation_id,
                validate_references=True,
            )
        )
        second = ClinicalAuditBuilder.build(
            AuditRequestValidator.validate(
                action=AuditAction.CONSULTATION_COMPLETED,
                event="Second",
                resource_type=ClinicalEntity.CONSULTATION,
                resource_id=str(uuid.uuid4()),
                source=AuditSource.DOCTOR,
                user_id="USR-001",
                organization_id=str(self.clinic.id),
                correlation_id=self.correlation_id,
                validate_references=True,
            )
        )
        saved = self.repository.bulk_save([first, second])
        self.assertEqual(len(saved), 2)

    def test_get_by_event_id(self) -> None:
        saved = self._create_record()
        fetched = self.repository.get_by_event_id(saved.id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.id, saved.id)

    def test_get_by_correlation_id(self) -> None:
        saved = self._create_record()
        results = self.repository.get_by_correlation_id(saved.correlation_id)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].id, saved.id)

    def test_filter_by_resource(self) -> None:
        saved = self._create_record()
        results = self.repository.filter_by_resource(
            ClinicalEntity.CONSULTATION,
            self.resource_id,
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].id, saved.id)

    def test_filter_by_patient(self) -> None:
        from tests.factories.patient import PatientAccountFactory

        patient = PatientAccountFactory()
        saved = self._create_record(patient_account_id=str(patient.id))
        results = self.repository.filter_by_patient(str(patient.id))
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].id, saved.id)

    def test_filter_by_consultation(self) -> None:
        consultation_id = str(uuid.uuid4())
        saved = self._create_record(
            consultation_id=consultation_id,
            validate_references=False,
        )
        results = self.repository.filter_by_consultation(consultation_id)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].id, saved.id)

    def test_saved_record_cannot_be_updated(self) -> None:
        saved = self._create_record()
        saved.event = "Changed"
        with self.assertRaises(ClinicalAuditImmutabilityError):
            saved.save()
