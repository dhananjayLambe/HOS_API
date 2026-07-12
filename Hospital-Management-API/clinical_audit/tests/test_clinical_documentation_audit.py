"""Unit tests for clinical documentation audit integration."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase

from clinical_audit.enums import AuditAction, ClinicalEntity
from clinical_audit.exceptions import AuditSerializationError
from clinical_audit.models import ClinicalAudit
from clinical_documentation.audit.clinical_documentation_audit_service import (
    ClinicalDocumentationAuditService,
)
from clinical_documentation.audit.payload_builder import ClinicalDocumentationPayloadBuilder
from clinical_documentation.audit.section_diff import diff_allergy_section, vitals_payloads_equal
from clinical_documentation.audit.snapshot_builder import ClinicalDocumentationSnapshotBuilder
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
        username=f"doc_cda_{uuid.uuid4().hex[:10]}",
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
        username=f"pat_cda_{uuid.uuid4().hex[:10]}",
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


def _diagnosis_row(**overrides):
    base = {
        "id": uuid.uuid4(),
        "display_name": "Essential Hypertension",
        "label": "Essential Hypertension",
        "icd_code": "I10",
        "diagnosis_type": "provisional",
        "is_primary": True,
        "severity": "mild",
        "doctor_note": None,
        "is_chronic": False,
        "master": None,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def _symptom_row(**overrides):
    base = {
        "id": uuid.uuid4(),
        "display_name": "Headache",
        "duration_value": 2,
        "duration_unit": "days",
        "extra_data": None,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


class ClinicalDocumentationPayloadBuilderTests(TestCase):
    def test_build_diagnosis_added_maps_fields(self) -> None:
        row = _diagnosis_row()
        payload = ClinicalDocumentationPayloadBuilder.build_diagnosis_added(diagnosis_row=row)
        self.assertEqual(payload["diagnosis_code"], "I10")
        self.assertEqual(payload["diagnosis_name"], "Essential Hypertension")
        self.assertEqual(payload["classification"], "provisional")
        self.assertTrue(payload["is_primary"])

    def test_build_diagnosis_updated_includes_changed_fields(self) -> None:
        payload = ClinicalDocumentationPayloadBuilder.build_diagnosis_updated(
            changed_fields=["classification", "severity"]
        )
        self.assertEqual(payload["changed_fields"], ["classification", "severity"])

    def test_build_allergy_added_maps_entry(self) -> None:
        payload = ClinicalDocumentationPayloadBuilder.build_allergy_added(
            allergy_entry={
                "allergen": "Penicillin",
                "reaction": "Skin Rash",
                "severity": "Moderate",
            }
        )
        self.assertEqual(payload["allergen"], "Penicillin")
        self.assertEqual(payload["reaction"], "Skin Rash")

    def test_build_vital_signs_recorded_maps_nested_json(self) -> None:
        payload = ClinicalDocumentationPayloadBuilder.build_vital_signs_recorded(
            vitals_data={
                "height_cm": 172,
                "weight_kg": 74,
                "temperature": {"value": 98.4, "unit": "c"},
                "bp": {"systolic": 120, "diastolic": 80},
                "pulse": 78,
                "spo2": 98,
            }
        )
        self.assertEqual(payload["height_cm"], 172)
        self.assertEqual(payload["weight_kg"], 74)
        self.assertEqual(payload["blood_pressure"], "120/80")
        self.assertEqual(payload["pulse"], 78)

    def test_build_symptoms_recorded_maps_duration(self) -> None:
        row = _symptom_row()
        payload = ClinicalDocumentationPayloadBuilder.build_symptoms_recorded(
            symptom_row=row,
            chief_complaint="Headache",
            symptom_names=["Headache", "Nausea"],
        )
        self.assertEqual(payload["chief_complaint"], "Headache")
        self.assertEqual(payload["symptoms"], ["Headache", "Nausea"])
        self.assertEqual(payload["duration"], "2 days")

    def test_build_clinical_notes_updated_includes_section(self) -> None:
        payload = ClinicalDocumentationPayloadBuilder.build_clinical_notes_updated(
            section="Assessment",
            changed_fields=["assessment"],
        )
        self.assertEqual(payload["section"], "Assessment")
        self.assertEqual(payload["changed_fields"], ["assessment"])

    def test_diff_diagnosis_fields_detects_changes(self) -> None:
        row = _diagnosis_row(severity="moderate", diagnosis_type="confirmed")
        prior = {
            "diagnosis_code": "I10",
            "diagnosis_name": "Essential Hypertension",
            "classification": "provisional",
            "severity": "mild",
            "is_primary": True,
        }
        changed = ClinicalDocumentationPayloadBuilder.diff_diagnosis_fields(prior, row)
        self.assertIn("classification", changed)
        self.assertIn("severity", changed)

    def test_forbidden_payload_key_rejected(self) -> None:
        from clinical_audit.domain.utils import sanitize_audit_payload

        with self.assertRaises(AuditSerializationError):
            sanitize_audit_payload({"access_token": "secret"})


class ClinicalDocumentationSnapshotBuilderTests(TestCase):
    def test_build_diagnosis_snapshot(self) -> None:
        snapshot = ClinicalDocumentationSnapshotBuilder.build_diagnosis_snapshot(
            prior_state={
                "diagnosis_code": "I10",
                "classification": "provisional",
                "severity": "mild",
                "is_primary": True,
            }
        )
        self.assertEqual(snapshot["diagnosis_code"], "I10")
        self.assertEqual(snapshot["classification"], "provisional")

    def test_build_allergy_snapshot(self) -> None:
        snapshot = ClinicalDocumentationSnapshotBuilder.build_allergy_snapshot(
            prior_entry={
                "allergen": "Penicillin",
                "reaction": "Rash",
                "severity": "Mild",
            }
        )
        self.assertEqual(snapshot["allergen"], "Penicillin")

    def test_build_clinical_notes_snapshot_truncates_long_content(self) -> None:
        snapshot = ClinicalDocumentationSnapshotBuilder.build_clinical_notes_snapshot(
            section="Assessment",
            prior_content="x" * 600,
        )
        self.assertLessEqual(len(snapshot["content_preview"]), 500)


class ClinicalDocumentationSectionDiffTests(TestCase):
    def test_diff_allergy_section_added_and_updated(self) -> None:
        prior = {
            "entries": [
                {
                    "allergen": {"allergen_name": "Penicillin"},
                    "reaction": "Rash",
                    "severity": "Mild",
                }
            ]
        }
        new = {
            "entries": [
                {
                    "allergen": {"allergen_name": "Penicillin"},
                    "reaction": "Anaphylaxis",
                    "severity": "Severe",
                },
                {
                    "allergen": {"allergen_name": "Latex"},
                    "reaction": "Itching",
                    "severity": "Mild",
                },
            ]
        }
        diff = diff_allergy_section(prior, new)
        self.assertEqual(len(diff["added"]), 1)
        self.assertEqual(diff["added"][0]["allergen"], "Latex")
        self.assertEqual(len(diff["updated"]), 1)
        self.assertEqual(diff["updated"][0]["key"], "penicillin")

    def test_vitals_payloads_equal_detects_no_change(self) -> None:
        data = {"height_cm": 170, "weight_kg": 70, "bp": {"systolic": 120, "diastolic": 80}}
        self.assertTrue(vitals_payloads_equal(data, dict(data)))


class ClinicalDocumentationAuditServiceTests(TestCase):
    def test_emit_diagnosis_added_creates_audit(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        row = _diagnosis_row()
        result = ClinicalDocumentationAuditService.emit_diagnosis_added(
            encounter,
            consultation,
            user,
            diagnosis_row=row,
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.DIAGNOSIS_ADDED)
        self.assertEqual(audit.resource_type, ClinicalEntity.DIAGNOSIS)
        self.assertEqual(audit.event, AuditAction.DIAGNOSIS_ADDED.label)

    def test_emit_diagnosis_added_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        row = _diagnosis_row()
        first = ClinicalDocumentationAuditService.emit_diagnosis_added(
            encounter, consultation, user, diagnosis_row=row
        )
        second = ClinicalDocumentationAuditService.emit_diagnosis_added(
            encounter, consultation, user, diagnosis_row=row
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_diagnosis_updated_skips_empty_changed_fields(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        row = _diagnosis_row()
        with patch(
            "clinical_documentation.audit.clinical_documentation_audit_service.ClinicalAuditService.record"
        ) as record:
            result = ClinicalDocumentationAuditService.emit_diagnosis_updated(
                encounter,
                consultation,
                user,
                diagnosis_row=row,
                changed_fields=[],
            )
        self.assertIsNone(result)
        record.assert_not_called()

    def test_emit_diagnosis_updated_stores_snapshot(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        row = _diagnosis_row()
        result = ClinicalDocumentationAuditService.emit_diagnosis_updated(
            encounter,
            consultation,
            user,
            diagnosis_row=row,
            changed_fields=["severity"],
            prior_state={
                "diagnosis_code": "I10",
                "classification": "provisional",
                "severity": "mild",
                "is_primary": True,
            },
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.previous_value["severity"], "mild")

    def test_emit_allergy_added_idempotent(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        section_id = uuid.uuid4()
        entry = {"allergen": "Penicillin", "reaction": "Rash", "severity": "Mild"}
        first = ClinicalDocumentationAuditService.emit_allergy_added(
            encounter,
            user,
            section_id=section_id,
            allergy_entry=entry,
            consultation=consultation,
        )
        second = ClinicalDocumentationAuditService.emit_allergy_added(
            encounter,
            user,
            section_id=section_id,
            allergy_entry=entry,
            consultation=consultation,
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_vital_signs_recorded(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        result = ClinicalDocumentationAuditService.emit_vital_signs_recorded(
            encounter,
            user,
            section_id=uuid.uuid4(),
            vitals_data={"height_cm": 170, "weight_kg": 70},
            consultation=consultation,
            source="helpdesk",
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.VITAL_SIGNS_RECORDED)
        self.assertEqual(audit.resource_type, ClinicalEntity.VITAL_SIGNS)

    def test_emit_symptoms_recorded(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        row = _symptom_row()
        result = ClinicalDocumentationAuditService.emit_symptoms_recorded(
            encounter,
            consultation,
            user,
            symptom_row=row,
            chief_complaint="Headache",
            symptom_names=["Headache"],
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.SYMPTOMS_RECORDED)

    def test_emit_clinical_notes_updated_facade_contract(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        result = ClinicalDocumentationAuditService.emit_clinical_notes_updated(
            encounter,
            user,
            resource_id=str(uuid.uuid4()),
            section="Assessment",
            changed_fields=["assessment"],
            prior_content="Prior note",
            consultation=consultation,
        )
        self.assertTrue(result.success)
        audit = ClinicalAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, AuditAction.CLINICAL_NOTES_UPDATED)

    def test_failure_isolation_returns_unsuccessful_result(self) -> None:
        encounter, consultation, user, _ = _encounter_bundle()
        row = _diagnosis_row()
        with patch(
            "clinical_documentation.audit.clinical_documentation_audit_service.ClinicalAuditService.record",
            return_value=type("R", (), {"success": False, "error": "boom"})(),
        ):
            result = ClinicalDocumentationAuditService.emit_diagnosis_added(
                encounter, consultation, user, diagnosis_row=row
            )
        self.assertFalse(result.success)
