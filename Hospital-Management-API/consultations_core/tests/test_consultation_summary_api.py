import datetime
import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinic.models import Clinic
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.follow_up import FollowUp
from consultations_core.models.instruction import EncounterInstruction
from consultations_core.models.prescription import Prescription, PrescriptionLine
from consultations_core.models.pre_consultation import (
    PreConsultation,
    PreConsultationChiefComplaint,
    PreConsultationVitals,
)
from consultations_core.services.consultation_summary_service import (
    build_consultation_summary,
    build_numeric_dose_display,
)
from consultations_core.services.encounter_service import EncounterService
from medicines.models import (
    DoseUnitMaster,
    DrugMaster,
    DrugType,
    FormulationMaster,
    FrequencyMaster,
    RouteMaster,
)
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _make_doctor_client():
    group, _ = Group.objects.get_or_create(name="doctor")
    user = User.objects.create_user(
        username=f"doc_sum_{uuid.uuid4().hex[:10]}",
        password="testpass123",
        first_name="Doc",
        last_name="Summary",
    )
    user.groups.add(group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def _build_consultation():
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    patient_user = User.objects.create_user(
        username=f"pat_sum_{uuid.uuid4().hex[:10]}",
        password="testpass123",
        first_name="Pat",
        last_name="Summary",
    )
    patient_account = PatientAccount.objects.create(user=patient_user)
    patient_account.clinics.add(clinic)
    profile = PatientProfile.objects.create(account=patient_account, first_name="Pat", relation="self", gender="male")
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=patient_account,
        patient_profile=profile,
    )
    consultation = Consultation.objects.create(encounter=encounter)
    ClinicalEncounter.objects.filter(pk=encounter.pk).update(status="consultation_in_progress")
    encounter.refresh_from_db()
    consultation.refresh_from_db()
    return consultation, encounter


class ConsultationSummaryAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        _, cls.doctor = _make_doctor_client()

        cls.formulation = FormulationMaster.objects.create(name=f"tab-{uuid.uuid4().hex[:4]}")
        cls.dose_unit = DoseUnitMaster.objects.create(name=f"mg-{uuid.uuid4().hex[:4]}")
        cls.route = RouteMaster.objects.first()
        if cls.route is None:
            cls.route = RouteMaster.objects.create(
                code=f"oral-{uuid.uuid4().hex[:4]}",
                name=f"oral-{uuid.uuid4().hex[:4]}",
                search_vector="oral",
            )

        cls.frequency = FrequencyMaster.objects.first()
        if cls.frequency is None:
            cls.frequency = FrequencyMaster.objects.create(
                code=f"bd-{uuid.uuid4().hex[:4]}",
                display_name="Twice daily",
                times_per_day=2,
                search_vector="twice",
            )
        cls.drug = DrugMaster.objects.create(
            code=f"sum-drug-{uuid.uuid4().hex[:6]}",
            brand_name="Summary Drug",
            formulation=cls.formulation,
            drug_type=DrugType.TABLET,
            is_active=True,
        )

    def setUp(self):
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.doctor)
        self.consultation, self.encounter = _build_consultation()

    def _full_url(self):
        return reverse("consultation-summary", kwargs={"consultation_id": self.consultation.id})

    def _lite_url(self):
        return reverse("consultation-summary-lite", kwargs={"consultation_id": self.consultation.id})

    def _lite_html_url(self):
        return reverse("consultation-summary-lite-html", kwargs={"consultation_id": self.consultation.id})

    def _seed_clinical_data(self):
        pre = PreConsultation.objects.create(
            encounter=self.encounter,
            specialty_code="general",
            template_version="v1",
            created_by=self.doctor,
            updated_by=self.doctor,
            entry_mode="doctor",
        )
        PreConsultationVitals.objects.create(
            pre_consultation=pre,
            data={"height_cm": 172, "weight_kg": 70, "bp": "120/80", "pulse": "78"},
            created_by=self.doctor,
            updated_by=self.doctor,
        )
        PreConsultationChiefComplaint.objects.create(
            pre_consultation=pre,
            data={"primary": "Fever for 2 days"},
            created_by=self.doctor,
            updated_by=self.doctor,
        )

        EncounterInstruction.objects.create(
            encounter=self.encounter,
            text_snapshot="Drink more water",
            source="custom",
            is_custom=True,
            is_active=True,
            added_by=self.doctor,
        )

        prescription = Prescription.objects.create(
            consultation=self.consultation,
            created_by=self.doctor,
            status="draft",
        )
        PrescriptionLine.objects.create(
            prescription=prescription,
            drug=self.drug,
            dose_value=1,
            dose_unit=self.dose_unit,
            route=self.route,
            frequency=self.frequency,
            duration_value=5,
            duration_unit="days",
            instructions="After food",
        )

        FollowUp.objects.create(
            consultation=self.consultation,
            follow_up_type=FollowUp.FollowUpType.EXACT_DATE,
            follow_up_date=datetime.date(2026, 5, 1),
            condition_note="Routine review",
            added_by=self.doctor,
        )

    def test_contract_shape_parity_between_full_and_lite(self):
        self._seed_clinical_data()
        full = self.api_client.get(self._full_url())
        lite = self.api_client.get(self._lite_url())

        self.assertEqual(full.status_code, status.HTTP_200_OK)
        self.assertEqual(lite.status_code, status.HTTP_200_OK)
        self.assertEqual(set(full.data.keys()), set(lite.data.keys()))
        self.assertEqual(full.data["meta"]["version"], "v1")
        self.assertEqual(lite.data["meta"]["version"], "v1")

    def test_lite_defaults_optional_sections_to_empty(self):
        self._seed_clinical_data()
        lite = self.api_client.get(self._lite_url())
        self.assertEqual(lite.status_code, status.HTTP_200_OK)
        self.assertEqual(lite.data["symptoms"], [])
        self.assertEqual(lite.data["findings"], [])
        self.assertEqual(lite.data["procedures"], [])
        self.assertEqual(len(lite.data["prescriptions"]), 1)
        self.assertEqual(len(lite.data["instructions"]), 1)
        self.assertIsInstance(lite.data["diagnoses"], list)
        self.assertIsInstance(lite.data["investigations"], list)
        self.assertIsInstance(lite.data["instructions"], list)
        self.assertIsInstance(lite.data["prescriptions"], list)
        self.assertIsInstance(lite.data["symptoms"], list)

    def test_lite_html_hides_optional_empty_sections_and_keeps_rx_fallback(self):
        response = self.api_client.get(self._lite_html_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        html = response.data["html"]
        self.assertIn("Rx", html)
        self.assertIn("No medicines prescribed", html)

        self.assertNotIn("Complaints</div>", html)
        self.assertNotIn("Diagnosis</div>", html)
        self.assertNotIn("Recommended Tests</div>", html)
        self.assertNotIn("Advice</div>", html)

    def test_lite_html_shows_vitals_and_follow_up_defaults(self):
        response = self.api_client.get(self._lite_html_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        html = response.data["html"]

        self.assertNotIn("BP: -", html)
        self.assertNotIn("Pulse: -", html)
        self.assertIn("Follow-up:</b> As advised", html)
        self.assertIn("This is a computer-generated prescription. Valid if digitally verified.", html)
        self.assertIn("Powered by MedixPro EMR", html)

    def test_lite_html_renders_pulse_from_nested_object_with_units(self):
        pre = PreConsultation.objects.create(
            encounter=self.encounter,
            specialty_code="general",
            template_version="v1",
            created_by=self.doctor,
            updated_by=self.doctor,
            entry_mode="doctor",
        )
        PreConsultationVitals.objects.create(
            pre_consultation=pre,
            data={
                "bp": {"systolic": 120, "diastolic": 80},
                "pulse": {"pulse_rate": 100},
                "temperature": {"value": 98.6, "unit": "F"},
                "weight_kg": 68,
                "height_cm": 161.544,
            },
            created_by=self.doctor,
            updated_by=self.doctor,
        )

        response = self.api_client.get(self._lite_html_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        html = response.data["html"]

        self.assertIn("BP: 120/80 mmHg", html)
        self.assertIn("Pulse: 100 bpm", html)
        self.assertIn("Temp: 98.6&deg;F", html)
        self.assertIn("Weight: 68 kg", html)
        self.assertIn("Height: 161.544 cm", html)

    def test_lite_html_renders_numeric_dose_and_clean_footer(self):
        self._seed_clinical_data()
        response = self.api_client.get(self._lite_html_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        html = response.data["html"]

        self.assertIn("1 tablet (1-0-1)", html)
        self.assertIn("5 days", html)
        self.assertIn("Dr. Doctor | Reg No: Not available", html)
        self.assertIn("Powered by MedixPro EMR &#8226; www.medixpro.com", html)
        self.assertNotIn("Valid without physical signature if digitally verified.", html)

    @override_settings(PRESCRIPTION_TIMING_SLOT_MAX=2)
    def test_numeric_dose_formatter_maps_and_validates_patterns(self):
        tablet = build_numeric_dose_display(
            dose_value="1",
            dose_unit="tablet",
            medicine_type="tablet",
            frequency_display="Twice daily",
            frequency_code="bd",
            route_display="",
            route_code="",
            instructions="After food",
        )
        self.assertEqual(tablet["timing_pattern"], "1-0-1")
        self.assertEqual(tablet["dose_display_numeric"], "1 tablet (1-0-1)")

        syrup = build_numeric_dose_display(
            dose_value="5",
            dose_unit="",
            medicine_type="syrup",
            frequency_display="Once daily",
            frequency_code="od",
            route_display="",
            route_code="",
            instructions="Shake well before use",
        )
        self.assertEqual(syrup["timing_pattern"], "0-0-1")
        self.assertEqual(syrup["dose_display_numeric"], "5 ml (0-0-1)")

        inhaler = build_numeric_dose_display(
            dose_value="2",
            dose_unit="",
            medicine_type="inhaler",
            frequency_display="Thrice daily",
            frequency_code="tid",
            route_display="",
            route_code="",
            instructions="",
        )
        self.assertEqual(inhaler["timing_pattern"], "1-1-1")
        self.assertEqual(inhaler["dose_display_numeric"], "2 puffs (1-1-1)")

        injection = build_numeric_dose_display(
            dose_value="1",
            dose_unit="",
            medicine_type="injection",
            frequency_display="Twice daily",
            frequency_code="bd",
            route_display="intravenous",
            route_code="",
            instructions="",
        )
        self.assertEqual(injection["dose_display_numeric"], "1 dose (1-0-1) IV")

        with self.assertRaises(ValueError):
            build_numeric_dose_display(
                dose_value="1",
                dose_unit="tablet",
                medicine_type="tablet",
                frequency_display="custom",
                frequency_code="",
                route_display="",
                route_code="",
                instructions="",
                timing_pattern="3-0-1",
            )

    def test_instructions_are_not_merged_with_prescription_line_instructions(self):
        self._seed_clinical_data()
        response = self.api_client.get(self._full_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["instructions"][0]["text"], "Drink more water")
        self.assertEqual(response.data["prescriptions"][0]["instructions"], "After food")

    def test_follow_up_model_is_primary_source_and_mismatch_logs_warning(self):
        self._seed_clinical_data()
        Consultation.objects.filter(pk=self.consultation.pk).update(follow_up_date=datetime.date(2026, 6, 1))
        with self.assertLogs("consultations_core.services.consultation_summary_service", level="WARNING") as logs:
            response = self.api_client.get(self._full_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["follow_up"]["date"], "2026-05-01")
        self.assertTrue(any("follow-up date mismatch" in message for message in logs.output))

    def test_full_endpoint_uses_more_queries_than_lite_for_same_consultation(self):
        self._seed_clinical_data()
        with CaptureQueriesContext(connection) as full_ctx:
            full = self.api_client.get(self._full_url())
        with CaptureQueriesContext(connection) as lite_ctx:
            lite = self.api_client.get(self._lite_url())

        self.assertEqual(full.status_code, status.HTTP_200_OK)
        self.assertEqual(lite.status_code, status.HTTP_200_OK)
        self.assertGreater(len(full_ctx), len(lite_ctx))

    def test_section_scoped_request_only_populates_requested_sections(self):
        self._seed_clinical_data()
        response = self.api_client.get(self._full_url(), {"sections": ["prescriptions", "diagnoses"]})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["prescriptions"]), 1)
        self.assertEqual(response.data["instructions"], [])
        self.assertEqual(response.data["investigations"], [])

    def test_status_transitions_draft_to_completed(self):
        draft = self.api_client.get(self._full_url())
        self.assertEqual(draft.status_code, status.HTTP_200_OK)
        self.assertEqual(draft.data["meta"]["status"], "in_progress")

        Consultation.objects.filter(pk=self.consultation.pk).update(
            is_finalized=True,
            ended_at=datetime.datetime.now(datetime.timezone.utc),
        )
        completed = self.api_client.get(self._full_url())
        self.assertEqual(completed.status_code, status.HTTP_200_OK)
        self.assertEqual(completed.data["meta"]["status"], "completed")

    def test_symptoms_fallback_to_preconsult_chief_complaint(self):
        pre = PreConsultation.objects.create(
            encounter=self.encounter,
            specialty_code="general",
            template_version="v1",
            created_by=self.doctor,
            updated_by=self.doctor,
            entry_mode="doctor",
        )
        PreConsultationChiefComplaint.objects.create(
            pre_consultation=pre,
            data={"primary": "Chest pain"},
            created_by=self.doctor,
            updated_by=self.doctor,
        )

        response = self.api_client.get(self._full_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["symptoms"]), 1)
        self.assertEqual(response.data["symptoms"][0]["name"], "Chest pain")

    @override_settings(ENABLE_CONSULTATION_SUMMARY_CACHE=True)
    def test_cache_not_set_for_in_progress_consultation(self):
        with patch("consultations_core.services.consultation_summary_service.cache.set") as cache_set:
            build_consultation_summary(self.consultation.id, profile="full")
        cache_set.assert_not_called()

    @override_settings(ENABLE_CONSULTATION_SUMMARY_CACHE=True, CONSULTATION_SUMMARY_CACHE_TTL_SECONDS=120)
    def test_cache_set_for_completed_consultation(self):
        Consultation.objects.filter(pk=self.consultation.pk).update(
            is_finalized=True,
            ended_at=datetime.datetime.now(datetime.timezone.utc),
        )
        with patch("consultations_core.services.consultation_summary_service.cache.set") as cache_set:
            payload = build_consultation_summary(self.consultation.id, profile="full")
        self.assertEqual(payload["meta"]["status"], "completed")
        cache_set.assert_called_once()
