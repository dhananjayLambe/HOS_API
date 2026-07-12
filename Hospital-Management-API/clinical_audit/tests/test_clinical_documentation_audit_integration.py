"""Integration tests for clinical documentation audit via API workflows."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinical_audit.enums import AuditAction
from clinical_audit.models import ClinicalAudit
from consultations_core.models.consultation import Consultation
from consultations_core.models.diagnosis import ConsultationDiagnosis
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.pre_consultation import PreConsultation
from consultations_core.services.encounter_service import EncounterService
from consultations_core.services.preconsultation_service import PreConsultationService
from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile
from shared.logging.context import LogContext, get_context_manager

User = get_user_model()


def _doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    user = User.objects.create_user(
        username=f"doc_cdai_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    user.groups.add(g)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def _helpdesk_client():
    g, _ = Group.objects.get_or_create(name="helpdesk")
    user = User.objects.create_user(
        username=f"hd_cdai_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    user.groups.add(g)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def _encounter_in_consultation(doctor_user):
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    doc_profile, _ = DoctorModel.objects.get_or_create(
        user=doctor_user,
        defaults={"primary_specialization": "General"},
    )
    doc_profile.clinics.add(clinic)
    pu = User.objects.create_user(
        username=f"pat_cdai_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    pa = PatientAccount.objects.create(user=pu)
    pa.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=pa,
        first_name="Pat",
        last_name="Test",
        relation="self",
        gender="male",
        age_years=30,
    )
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=pa,
        patient_profile=profile,
        doctor=doc_profile,
        created_by=doctor_user,
    )
    consultation = Consultation.objects.create(encounter=encounter)
    ClinicalEncounter.objects.filter(pk=encounter.pk).update(
        status="consultation_in_progress"
    )
    encounter.refresh_from_db()
    return consultation, encounter, clinic, doc_profile


def _preconsult_encounter(doctor_user):
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    doc_profile, _ = DoctorModel.objects.get_or_create(
        user=doctor_user,
        defaults={"primary_specialization": "general"},
    )
    doc_profile.clinics.add(clinic)
    pu = User.objects.create_user(
        username=f"pat_pc_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    pa = PatientAccount.objects.create(user=pu)
    pa.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=pa,
        first_name="Pat",
        last_name="Test",
        relation="self",
        gender="male",
        age_years=30,
    )
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=pa,
        patient_profile=profile,
        doctor=doc_profile,
        created_by=doctor_user,
    )
    PreConsultationService.create_preconsultation(
        encounter=encounter,
        specialty_code="general",
        template_version="v1",
        entry_mode="doctor",
        created_by=doctor_user,
    )
    return encounter, clinic


def _base_complete_payload(**section_overrides):
    store = {
        "sectionItems": {
            "symptoms": [],
            "findings": [],
            "diagnosis": [],
            "medicines": [],
            "investigations": [],
            "instructions": {
                "template_instructions": [],
                "custom_instructions": [],
            },
        },
        "draftFindings": [],
    }
    for key, val in section_overrides.items():
        store["sectionItems"][key] = val
    return {"mode": "commit", "store": store}


class ClinicalDocumentationAuditIntegrationTests(TestCase):
    def setUp(self) -> None:
        self.client, self.doctor_user = _doctor_client()
        self.consultation, self.encounter, self.clinic, _ = _encounter_in_consultation(
            self.doctor_user
        )
        self.correlation_id = str(uuid.uuid4())
        self.client.defaults["HTTP_X_CORRELATION_ID"] = self.correlation_id
        get_context_manager().set(
            LogContext(correlation_id=self.correlation_id, request_id="req-cdai")
        )

    def tearDown(self) -> None:
        get_context_manager().clear()

    def _complete_url(self):
        return reverse("consultation-complete", kwargs={"encounter_id": self.encounter.id})

    def _section_url(self, encounter_id, section_code):
        return reverse(
            "pre-consult-section",
            kwargs={"encounter_id": encounter_id, "section_code": section_code},
        )

    def test_complete_with_diagnosis_emits_diagnosis_added(self) -> None:
        payload = _base_complete_payload(
            diagnosis=[
                {
                    "label": "Custom DX",
                    "isCustom": True,
                    "is_custom": True,
                    "custom_name": "Custom DX",
                }
            ]
        )
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self._complete_url(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audits = ClinicalAudit.objects.filter(action=AuditAction.DIAGNOSIS_ADDED)
        self.assertEqual(audits.count(), 1)
        self.assertEqual(audits.first().correlation_id, self.correlation_id)

    def test_complete_with_symptoms_emits_symptoms_recorded(self) -> None:
        payload = _base_complete_payload(
            symptoms=[{"name": "Headache", "detail": {"duration": "2 days"}}]
        )
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self._complete_url(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audits = ClinicalAudit.objects.filter(action=AuditAction.SYMPTOMS_RECORDED)
        self.assertGreaterEqual(audits.count(), 1)

    def test_diagnosis_update_emits_updated_with_snapshot(self) -> None:
        from consultations_core.services.end_consultation_service import _persist_diagnoses

        raw = [
            {
                "diagnosis_key": "upper_respiratory_infection",
                "diagnosis_icd_code": "J06.9",
                "diagnosis_label": "URTI",
                "diagnosis_type": "provisional",
                "is_primary": False,
            }
        ]
        with self.captureOnCommitCallbacks(execute=True):
            _persist_diagnoses(self.consultation, self.doctor_user, raw)
        raw[0]["diagnosis_type"] = "confirmed"
        with self.captureOnCommitCallbacks(execute=True):
            _persist_diagnoses(self.consultation, self.doctor_user, raw)
        updated = ClinicalAudit.objects.filter(action=AuditAction.DIAGNOSIS_UPDATED)
        self.assertGreaterEqual(updated.count(), 1)
        self.assertIsNotNone(updated.first().previous_value)

    def test_allergy_section_create_emits_allergy_added(self) -> None:
        encounter, _ = _preconsult_encounter(self.doctor_user)
        data = {
            "entries": [
                {
                    "allergen": {"allergen_name": "Penicillin"},
                    "reaction": "Rash",
                    "severity": "Mild",
                }
            ]
        }
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self._section_url(encounter.id, "allergies"),
                {"data": data},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audits = ClinicalAudit.objects.filter(action=AuditAction.ALLERGY_ADDED)
        self.assertEqual(audits.count(), 1)

    def test_allergy_section_update_emits_allergy_updated(self) -> None:
        encounter, _ = _preconsult_encounter(self.doctor_user)
        initial = {
            "entries": [
                {
                    "allergen": {"allergen_name": "Penicillin"},
                    "reaction": "Rash",
                    "severity": "Mild",
                }
            ]
        }
        updated = {
            "entries": [
                {
                    "allergen": {"allergen_name": "Penicillin"},
                    "reaction": "Anaphylaxis",
                    "severity": "Severe",
                }
            ]
        }
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                self._section_url(encounter.id, "allergies"),
                {"data": initial},
                format="json",
            )
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self._section_url(encounter.id, "allergies"),
                {"data": updated},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audits = ClinicalAudit.objects.filter(action=AuditAction.ALLERGY_UPDATED)
        self.assertEqual(audits.count(), 1)
        self.assertIsNotNone(audits.first().previous_value)

    def test_preconsult_vitals_section_emits_vitals_recorded(self) -> None:
        encounter, _ = _preconsult_encounter(self.doctor_user)
        data = {
            "height_cm": 172,
            "weight_kg": 74,
            "bp": {"systolic": 120, "diastolic": 80},
        }
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self._section_url(encounter.id, "vitals"),
                {"data": data},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audits = ClinicalAudit.objects.filter(action=AuditAction.VITAL_SIGNS_RECORDED)
        self.assertEqual(audits.count(), 1)

    def test_visit_vitals_api_emits_vitals_recorded(self) -> None:
        helpdesk_client, helpdesk_user = _helpdesk_client()
        encounter, clinic = _preconsult_encounter(self.doctor_user)
        helpdesk_client.defaults["HTTP_X_CORRELATION_ID"] = self.correlation_id
        with self.captureOnCommitCallbacks(execute=True):
            response = helpdesk_client.post(
                reverse("visit-vitals", kwargs={"visit_id": encounter.id}),
                {"bp_systolic": 118, "bp_diastolic": 76, "weight": 72.0},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        audits = ClinicalAudit.objects.filter(action=AuditAction.VITAL_SIGNS_RECORDED)
        self.assertGreaterEqual(audits.count(), 1)

    def test_identical_allergy_retry_does_not_duplicate_audit(self) -> None:
        encounter, _ = _preconsult_encounter(self.doctor_user)
        data = {
            "entries": [
                {
                    "allergen": {"allergen_name": "Penicillin"},
                    "reaction": "Rash",
                    "severity": "Mild",
                }
            ]
        }
        url = self._section_url(encounter.id, "allergies")
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(url, {"data": data}, format="json")
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(url, {"data": data}, format="json")
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.ALLERGY_ADDED).count(),
            1,
        )

    def test_identical_vitals_retry_does_not_duplicate_audit(self) -> None:
        encounter, _ = _preconsult_encounter(self.doctor_user)
        data = {"height_cm": 170, "weight_kg": 70, "bp": {"systolic": 120, "diastolic": 80}}
        url = self._section_url(encounter.id, "vitals")
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(url, {"data": data}, format="json")
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(url, {"data": data}, format="json")
        self.assertEqual(
            ClinicalAudit.objects.filter(action=AuditAction.VITAL_SIGNS_RECORDED).count(),
            1,
        )

    def test_audit_failure_does_not_block_complete(self) -> None:
        payload = _base_complete_payload(
            diagnosis=[
                {
                    "label": "Custom DX",
                    "isCustom": True,
                    "is_custom": True,
                    "custom_name": "Custom DX",
                }
            ]
        )
        with patch(
            "clinical_documentation.audit.clinical_documentation_audit_service.ClinicalAuditService.record",
            return_value=type(
                "R",
                (),
                {"success": False, "error": "boom", "correlation_id": self.correlation_id},
            )(),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(self._complete_url(), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(
            ConsultationDiagnosis.objects.filter(
                consultation=self.consultation, is_active=True
            ).count(),
            1,
        )

    def test_workflow_shares_correlation_id(self) -> None:
        encounter, _ = _preconsult_encounter(self.doctor_user)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                self._section_url(encounter.id, "vitals"),
                {
                    "data": {
                        "height_cm": 170,
                        "weight_kg": 70,
                        "bp": {"systolic": 120, "diastolic": 80},
                    }
                },
                format="json",
            )
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(
            status="consultation_in_progress"
        )
        consultation = Consultation.objects.create(encounter=encounter)
        payload = _base_complete_payload(
            symptoms=[{"name": "Headache"}],
            diagnosis=[
                {
                    "label": "Custom DX",
                    "isCustom": True,
                    "is_custom": True,
                    "custom_name": "Custom DX",
                }
            ],
        )
        complete_url = reverse("consultation-complete", kwargs={"encounter_id": encounter.id})
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(complete_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        actions = {
            AuditAction.VITAL_SIGNS_RECORDED,
            AuditAction.SYMPTOMS_RECORDED,
            AuditAction.DIAGNOSIS_ADDED,
        }
        for action in actions:
            rows = ClinicalAudit.objects.filter(action=action)
            self.assertGreaterEqual(rows.count(), 1, action)
            self.assertEqual(rows.first().correlation_id, self.correlation_id)
