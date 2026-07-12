"""Unit tests for prescription audit integration."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone as dt_timezone
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase

from clinical_audit.enums import AuditAction, ClinicalEntity
from clinical_audit.exceptions import AuditSerializationError
from clinical_audit.models import ClinicalAudit
from consultations_core.audit.prescription.prescription_audit_service import PrescriptionAuditService
from consultations_core.audit.prescription.prescription_payload_builder import PrescriptionPayloadBuilder
from consultations_core.audit.prescription.prescription_snapshot_builder import PrescriptionSnapshotBuilder
from consultations_core.audit.prescription.recommendation_payload_builder import RecommendationPayloadBuilder
from consultations_core.audit.prescription.recommendation_snapshot_builder import RecommendationSnapshotBuilder
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
        username=f"doc_pa_{uuid.uuid4().hex[:10]}",
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
        username=f"pat_pa_{uuid.uuid4().hex[:10]}",
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


def _prescription_stub(**overrides):
    base = {
        "id": uuid.uuid4(),
        "status": "draft",
        "finalized_at": None,
        "version_number": 1,
        "lines": SimpleNamespace(count=lambda: 3),
    }
    base.update(overrides)
    return SimpleNamespace(**base)


class PrescriptionPayloadBuilderTests(TestCase):
    def test_build_created_maps_fields(self) -> None:
        payload = PrescriptionPayloadBuilder.build_created(medicine_count=5)
        self.assertEqual(payload["medicine_count"], 5)
        self.assertEqual(payload["prescription_type"], "Digital")
        self.assertFalse(payload["is_signed"])

    def test_build_updated_includes_changed_fields(self) -> None:
        payload = PrescriptionPayloadBuilder.build_updated(
            changed_fields=["dosage", "duration"]
        )
        self.assertEqual(payload["changed_fields"], ["dosage", "duration"])

    def test_build_signed_includes_finalized_at(self) -> None:
        ts = datetime(2026, 7, 12, 10, 0, tzinfo=dt_timezone.utc)
        payload = PrescriptionPayloadBuilder.build_signed(
            finalized_at=ts,
            doctor_license="LIC-123",
        )
        self.assertTrue(payload["finalized"])
        self.assertEqual(payload["doctor_license"], "LIC-123")
        self.assertIn("2026", payload["signed_at"])

    def test_build_downloaded_maps_actor(self) -> None:
        payload = PrescriptionPayloadBuilder.build_downloaded(downloaded_by="Patient")
        self.assertEqual(payload["downloaded_by"], "Patient")
        self.assertEqual(payload["download_format"], "PDF")

    def test_diff_prescription_fields_detects_changes(self) -> None:
        changed = PrescriptionPayloadBuilder.diff_prescription_fields(
            {"medicine_count": 2, "status": "draft", "version_number": 1},
            medicine_count=3,
            status="draft",
            version_number=1,
        )
        self.assertEqual(changed, ["medicine_count"])

    def test_forbidden_payload_key_rejected(self) -> None:
        from clinical_audit.domain.utils import sanitize_audit_payload

        with self.assertRaises(AuditSerializationError):
            sanitize_audit_payload({"refresh_token": "secret"})


class RecommendationPayloadBuilderTests(TestCase):
    def test_build_generated_maps_count(self) -> None:
        result = SimpleNamespace(
            expanded_tests=[1, 2],
            packages=[1],
        )
        payload = RecommendationPayloadBuilder.build_generated(
            recommendation_count=RecommendationPayloadBuilder.count_from_result(result),
        )
        self.assertEqual(payload["recommendation_type"], "Diagnostic")
        self.assertEqual(payload["recommendation_count"], 3)

    def test_build_accepted_maps_items(self) -> None:
        payload = RecommendationPayloadBuilder.build_accepted(
            accepted_items=2,
            rejected_items=1,
        )
        self.assertEqual(payload["accepted_items"], 2)
        self.assertEqual(payload["rejected_items"], 1)


class PrescriptionSnapshotBuilderTests(TestCase):
    def test_build_prescription_snapshot(self) -> None:
        snapshot = PrescriptionSnapshotBuilder.build_prescription_snapshot(
            prior_state={"medicine_count": 2, "status": "draft", "version_number": 1}
        )
        self.assertEqual(snapshot["medicine_count"], 2)
        self.assertEqual(snapshot["status"], "draft")

    def test_build_recommendation_acceptance_snapshot(self) -> None:
        snapshot = RecommendationSnapshotBuilder.build_acceptance_snapshot(
            prior_accepted_items=0,
            prior_rejected_items=2,
        )
        self.assertEqual(snapshot["accepted_items"], 0)
        self.assertEqual(snapshot["rejected_items"], 2)


class PrescriptionAuditServiceTests(TestCase):
    def test_emit_prescription_created_creates_audit(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rx = _prescription_stub()
        result = PrescriptionAuditService.emit_prescription_created(
            encounter, consultation, user, prescription=rx
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.PRESCRIPTION_CREATED)
        self.assertEqual(audit.resource_type, ClinicalEntity.PRESCRIPTION)
        self.assertEqual(audit.event, AuditAction.PRESCRIPTION_CREATED.label)

    def test_emit_prescription_created_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rx = _prescription_stub()
        first = PrescriptionAuditService.emit_prescription_created(
            encounter, consultation, user, prescription=rx
        )
        second = PrescriptionAuditService.emit_prescription_created(
            encounter, consultation, user, prescription=rx
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_prescription_signed_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rx = _prescription_stub(
            finalized_at=datetime(2026, 7, 12, 10, 0, tzinfo=dt_timezone.utc)
        )
        first = PrescriptionAuditService.emit_prescription_signed(
            encounter, consultation, user, prescription=rx
        )
        second = PrescriptionAuditService.emit_prescription_signed(
            encounter, consultation, user, prescription=rx
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_prescription_updated_skips_empty_changed_fields(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rx = _prescription_stub()
        with patch(
            "consultations_core.audit.prescription.prescription_audit_service.ClinicalAuditService.record"
        ) as record:
            result = PrescriptionAuditService.emit_prescription_updated(
                encounter,
                consultation,
                user,
                prescription=rx,
                changed_fields=[],
            )
        self.assertIsNone(result)
        record.assert_not_called()

    def test_emit_prescription_updated_stores_snapshot(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rx = _prescription_stub()
        result = PrescriptionAuditService.emit_prescription_updated(
            encounter,
            consultation,
            user,
            prescription=rx,
            changed_fields=["medicine_count"],
            prior_state={"medicine_count": 2, "status": "draft"},
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.previous_value["medicine_count"], 2)

    def test_emit_prescription_downloaded(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rx = _prescription_stub()
        result = PrescriptionAuditService.emit_prescription_downloaded(
            encounter,
            consultation,
            None,
            prescription=rx,
            downloaded_by="Anonymous",
            source="patient",
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.PRESCRIPTION_DOWNLOADED)

    def test_emit_recommendation_generated(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rec_id = uuid.uuid4()
        result = SimpleNamespace(expanded_tests=[1, 2], packages=[])
        audit_result = PrescriptionAuditService.emit_recommendation_generated(
            encounter,
            consultation,
            user,
            recommendation_id=rec_id,
            result=result,
        )
        self.assertTrue(audit_result.success)
        audit = ClinicalAudit.objects.get(pk=audit_result.audit_id)
        self.assertEqual(audit.action, AuditAction.RECOMMENDATION_GENERATED)
        self.assertEqual(audit.new_value["payload"]["recommendation_count"], 2)

    def test_emit_recommendation_accepted_facade_contract(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rec_id = uuid.uuid4()
        result = PrescriptionAuditService.emit_recommendation_accepted(
            encounter,
            consultation,
            user,
            recommendation_id=rec_id,
            accepted_items=2,
            rejected_items=1,
            prior_accepted_items=0,
            prior_rejected_items=2,
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.RECOMMENDATION_ACCEPTED)

    def test_failure_isolation_returns_unsuccessful_result(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rx = _prescription_stub()
        with patch(
            "consultations_core.audit.prescription.prescription_audit_service.ClinicalAuditService.record",
            return_value=type(
                "R",
                (),
                {"success": False, "error": "boom", "correlation_id": str(uuid.uuid4())},
            )(),
        ):
            result = PrescriptionAuditService.emit_prescription_created(
                encounter, consultation, user, prescription=rx
            )
        self.assertFalse(result.success)

    def test_resolve_downloaded_by_anonymous(self) -> None:
        request = SimpleNamespace(user=SimpleNamespace(is_authenticated=False))
        self.assertEqual(PrescriptionAuditService.resolve_downloaded_by(request), "Anonymous")

    def test_resolve_downloaded_by_doctor(self) -> None:
        user = _doctor_user()
        request = SimpleNamespace(user=user)
        self.assertEqual(PrescriptionAuditService.resolve_downloaded_by(request), "Doctor")

    def test_emit_prescription_signed_creates_audit(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rx = _prescription_stub(
            finalized_at=datetime(2026, 7, 12, 10, 0, tzinfo=dt_timezone.utc)
        )
        result = PrescriptionAuditService.emit_prescription_signed(
            encounter, consultation, user, prescription=rx
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.PRESCRIPTION_SIGNED)
        self.assertTrue(audit.new_value["payload"]["finalized"])

    def test_emit_recommendation_generated_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        rec_id = uuid.uuid4()
        result = SimpleNamespace(expanded_tests=[1], packages=[])
        first = PrescriptionAuditService.emit_recommendation_generated(
            encounter, consultation, user, recommendation_id=rec_id, result=result
        )
        second = PrescriptionAuditService.emit_recommendation_generated(
            encounter, consultation, user, recommendation_id=rec_id, result=result
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_build_line_metadata_snapshot(self) -> None:
        line = SimpleNamespace(
            drug=SimpleNamespace(code="RX-001"),
            custom_medicine=None,
            drug_name_snapshot="Paracetamol",
            dose_value=500,
            duration_value=3,
            duration_unit="days",
        )
        metadata = PrescriptionSnapshotBuilder.build_line_metadata_snapshot([line])
        self.assertEqual(metadata[0]["drug_code"], "RX-001")
        self.assertEqual(metadata[0]["name"], "Paracetamol")
