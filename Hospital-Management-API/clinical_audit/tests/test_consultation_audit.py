"""Unit tests for consultation audit integration."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase

from clinical_audit.enums import AuditAction, ClinicalEntity
from clinical_audit.exceptions import AuditSerializationError
from clinical_audit.models import ClinicalAudit
from consultations_core.audit.consultation_audit_service import ConsultationAuditService
from consultations_core.audit.payload_builder import ConsultationAuditPayloadBuilder
from consultations_core.audit.statistics_builder import ConsultationStatisticsBuilder
from consultations_core.models.consultation import Consultation
from consultations_core.services.encounter_service import EncounterService
from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile
from tests.factories.clinic import ClinicFactory

User = get_user_model()


def _doctor_user():
    g, _ = Group.objects.get_or_create(name="doctor")
    user = User.objects.create_user(
        username=f"doc_ca_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    user.groups.add(g)
    return user


def _encounter_bundle():
    clinic = ClinicFactory()
    doctor_user = _doctor_user()
    doc_profile, _ = DoctorModel.objects.get_or_create(
        user=doctor_user,
        defaults={"primary_specialization": "General"},
    )
    doc_profile.clinics.add(clinic)
    patient_user = User.objects.create_user(
        username=f"pat_ca_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    account = PatientAccount.objects.create(user=patient_user)
    account.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=account,
        first_name="Pat",
        last_name="Test",
        relation="self",
        gender="male",
        age_years=30,
    )
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=account,
        patient_profile=profile,
        doctor=doc_profile,
        created_by=doctor_user,
    )
    consultation = Consultation.objects.create(encounter=encounter)
    return encounter, consultation, doctor_user, clinic


class ConsultationAuditPayloadBuilderTests(TestCase):
    def test_build_findings_updated_includes_section(self) -> None:
        payload = ConsultationAuditPayloadBuilder.build_findings_updated(
            changed_fields=["severity", "note"]
        )
        self.assertEqual(payload["section"], "findings")
        self.assertEqual(payload["changed_fields"], ["severity", "note"])

    def test_build_completed_includes_status_fields(self) -> None:
        encounter, consultation, _, _ = _encounter_bundle()
        stats = ConsultationStatisticsBuilder.build_completion_stats(consultation)
        payload = ConsultationAuditPayloadBuilder.build_completed(
            stats=stats,
            consultation=consultation,
            encounter=encounter,
            completion_source="doctor",
        )
        self.assertEqual(payload["completion_source"], "doctor")
        self.assertIn("encounter_status", payload)
        self.assertIn("consultation_status", payload)

    def test_forbidden_payload_key_rejected(self) -> None:
        from clinical_audit.domain.utils import sanitize_audit_payload

        with self.assertRaises(AuditSerializationError):
            sanitize_audit_payload({"password": "x"})
        oversized = {"field": "x" * 100_000}
        with self.assertRaises(AuditSerializationError):
            sanitize_audit_payload(oversized)


class ConsultationAuditServiceTests(TestCase):
    def test_emit_started_skips_already_started(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        with patch(
            "consultations_core.audit.consultation_audit_service.ClinicalAuditService.record"
        ) as record:
            result = ConsultationAuditService.emit_started(
                encounter,
                consultation,
                user,
                already_started=True,
            )
        self.assertIsNone(result)
        record.assert_not_called()

    def test_emit_started_creates_audit_with_enum_label(self) -> None:
        encounter, consultation, user, clinic = _encounter_bundle()
        result = ConsultationAuditService.emit_started(
            encounter,
            consultation,
            user,
            source="doctor",
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.CONSULTATION_STARTED)
        self.assertEqual(audit.event, AuditAction.CONSULTATION_STARTED.label)
        self.assertEqual(audit.resource_type, ClinicalEntity.CONSULTATION)

    def test_emit_findings_updated_stores_snapshot(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        snapshot = ConsultationAuditService.capture_snapshot(encounter, consultation)
        result = ConsultationAuditService.emit_findings_updated(
            encounter,
            consultation,
            user,
            changed_fields=["note"],
            snapshot=snapshot,
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.CONSULTATION_FINDINGS_UPDATED)
        self.assertEqual(audit.previous_value["encounter_status"], encounter.status)

    def test_emit_completed_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        first = ConsultationAuditService.emit_completed(
            encounter, consultation, user, completion_source="doctor"
        )
        second = ConsultationAuditService.emit_completed(
            encounter, consultation, user, completion_source="doctor"
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)
        self.assertEqual(
            ClinicalAudit.objects.filter(
                resource_id=str(consultation.id),
                action=AuditAction.CONSULTATION_COMPLETED,
            ).count(),
            1,
        )

    def test_emit_cancelled_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        first = ConsultationAuditService.emit_cancelled(
            encounter,
            user,
            reason="Patient unavailable",
            prior_status="consultation_in_progress",
            consultation=consultation,
        )
        second = ConsultationAuditService.emit_cancelled(
            encounter,
            user,
            reason="Patient unavailable",
            prior_status="consultation_in_progress",
            consultation=consultation,
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)
        self.assertEqual(
            ClinicalAudit.objects.filter(
                resource_id=str(consultation.id),
                action=AuditAction.CONSULTATION_CANCELLED,
            ).count(),
            1,
        )

    def test_emit_reopened_facade_only(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        result = ConsultationAuditService.emit_reopened(
            encounter,
            consultation,
            user,
            reason="Correction",
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.CONSULTATION_REOPENED)

    def test_failure_isolation_from_record_service(self) -> None:
        from clinical_audit.domain.types import AuditRecordResult

        encounter, consultation, user, _ = _encounter_bundle()
        with patch(
            "consultations_core.audit.consultation_audit_service.ClinicalAuditService.record",
            return_value=AuditRecordResult(
                success=False,
                correlation_id="corr",
                error="db down",
            ),
        ):
            result = ConsultationAuditService.emit_started(
                encounter, consultation, user, source="doctor"
            )
        self.assertFalse(result.success)

    def test_audit_event_label_matches_action(self) -> None:
        from clinical_audit.domain.utils import audit_event_label

        self.assertEqual(
            audit_event_label(AuditAction.CONSULTATION_INSTRUCTIONS_UPDATED),
            "Consultation Instructions Updated",
        )
