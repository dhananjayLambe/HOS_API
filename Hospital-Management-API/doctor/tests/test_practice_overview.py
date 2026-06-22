"""Integration tests for GET /api/v1/doctors/dashboard/practice-overview/."""

from __future__ import annotations

from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from doctor.api.services.patients_dashboard_service import build_doctor_patients_dashboard
from doctor.api.services.practice_overview_service import build_practice_overview
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.patient import PatientProfileFactory
from tests.factories.user import UserFactory


class DoctorPracticeOverviewIntegrationTests(APITestCase):
    def setUp(self):
        self.url = reverse("doctor_dashboard:dashboard-practice-overview")
        self.clinic = ClinicFactory()
        self.clinic_b = ClinicFactory()

        self.doctor_user = UserFactory(username="91000004001")
        ensure_doctor_group(self.doctor_user)
        self.doctor = DoctorFactory(user=self.doctor_user, clinics=(self.clinic,))

        self.doctor_b_user = UserFactory(username="91000004002")
        ensure_doctor_group(self.doctor_b_user)
        self.doctor_b = DoctorFactory(user=self.doctor_b_user, clinics=(self.clinic_b,))

        self.helpdesk_user = UserFactory(username="91000004003")
        helpdesk_group, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user.groups.add(helpdesk_group)

    def _auth_doctor(self):
        self.client.force_authenticate(user=self.doctor_user)

    def _closed_visit(
        self,
        profile,
        doctor,
        clinic,
        *,
        created_at=None,
        status_value="consultation_completed",
        encounter_type="appointment",
    ):
        enc = ClinicalEncounter.objects.create(
            clinic=clinic,
            doctor=doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="created",
            is_active=True,
            encounter_type=encounter_type,
        )
        consultation = Consultation.objects.create(encounter=enc)
        consultation.is_finalized = True
        consultation.ended_at = timezone.now()
        consultation.save()
        enc.refresh_from_db()
        if created_at is not None:
            ClinicalEncounter.objects.filter(pk=enc.pk).update(created_at=created_at)
            enc.refresh_from_db()
        if status_value != enc.status:
            ClinicalEncounter.objects.filter(pk=enc.pk).update(status=status_value, is_active=False)
            enc.refresh_from_db()
        return enc, consultation

    def test_non_doctor_forbidden(self):
        self.client.force_authenticate(user=self.helpdesk_user)
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_clinic_id_required(self):
        self._auth_doctor()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generated_at_present(self):
        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("generated_at", response.data["data"])

    def test_v2_analytics_reserved_empty(self):
        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        v2 = response.data["data"]["v2_analytics"]
        self.assertEqual(v2["daily_consultations"], [])
        self.assertEqual(v2["monthly_growth"], [])
        self.assertEqual(v2["top_diagnoses"], [])
        self.assertEqual(v2["top_prescribed_medicines"], [])

    def test_recent_trends_metric_key_and_label(self):
        profile = PatientProfileFactory()
        self._closed_visit(profile, self.doctor, self.clinic, created_at=timezone.now())

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        trends = response.data["data"]["recent_trends"]
        self.assertEqual(len(trends), 3)
        keys = {row["metric_key"] for row in trends}
        self.assertEqual(keys, {"consultations", "follow_ups", "new_patients"})
        for row in trends:
            self.assertIn("label", row)
            self.assertGreaterEqual(row["week"], row["today"])

    def test_patients_today_distinct(self):
        profile = PatientProfileFactory()
        now = timezone.now()
        self._closed_visit(profile, self.doctor, self.clinic, created_at=now)
        self._closed_visit(profile, self.doctor, self.clinic, created_at=now - timedelta(hours=2))

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        metrics = response.data["data"]["practice_metrics"]
        self.assertEqual(metrics["patients_today"], 1)
        self.assertEqual(metrics["consultations_completed"], 2)

    def test_consultations_completed_today_only(self):
        profile = PatientProfileFactory()
        self._closed_visit(
            profile,
            self.doctor,
            self.clinic,
            created_at=timezone.now() - timedelta(days=1),
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        metrics = response.data["data"]["practice_metrics"]
        self.assertEqual(metrics["consultations_completed"], 0)
        self.assertEqual(metrics["patients_today"], 0)

    def test_followups_completed_today_only(self):
        profile = PatientProfileFactory()
        self._closed_visit(
            profile,
            self.doctor,
            self.clinic,
            created_at=timezone.now(),
            encounter_type="follow_up",
        )
        self._closed_visit(
            profile,
            self.doctor,
            self.clinic,
            created_at=timezone.now() - timedelta(days=2),
            encounter_type="follow_up",
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        metrics = response.data["data"]["practice_metrics"]
        self.assertEqual(metrics["followups_completed"], 1)

    def test_new_patient_scoped_to_doctor_clinic(self):
        profile = PatientProfileFactory()
        self._closed_visit(
            profile,
            self.doctor,
            self.clinic,
            created_at=timezone.now() - timedelta(days=30),
        )
        self._closed_visit(
            profile,
            self.doctor_b,
            self.clinic_b,
            created_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.doctor_b_user)
        response = self.client.get(self.url, {"clinic_id": str(self.clinic_b.id)})
        summary = response.data["data"]["practice_summary"]
        self.assertEqual(summary["new_patients"], 1)

    def test_returning_patients_requires_multiple_completed(self):
        profile = PatientProfileFactory()
        now = timezone.now()
        self._closed_visit(profile, self.doctor, self.clinic, created_at=now)

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.data["data"]["practice_summary"]["returning_patients"], 0)

        self._closed_visit(profile, self.doctor, self.clinic, created_at=now - timedelta(days=5))
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.data["data"]["practice_summary"]["returning_patients"], 1)

    def test_returning_patients_completed_only(self):
        profile = PatientProfileFactory()
        now = timezone.now()
        self._closed_visit(profile, self.doctor, self.clinic, created_at=now - timedelta(days=10))
        self._closed_visit(
            profile,
            self.doctor,
            self.clinic,
            created_at=now,
            status_value="cancelled",
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.data["data"]["practice_summary"]["returning_patients"], 0)

    def test_clinic_scoping_excludes_other_clinic(self):
        profile_a = PatientProfileFactory(first_name="Clinic", last_name="A")
        profile_b = PatientProfileFactory(first_name="Clinic", last_name="B")
        self._closed_visit(profile_a, self.doctor, self.clinic, created_at=timezone.now())
        self._closed_visit(profile_b, self.doctor, self.clinic_b, created_at=timezone.now())

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        metrics = response.data["data"]["practice_metrics"]
        self.assertEqual(metrics["patients_today"], 1)
        self.assertEqual(metrics["consultations_completed"], 1)

    def test_active_treatments_matches_patients_tab(self):
        self._auth_doctor()
        practice = self.client.get(self.url, {"clinic_id": str(self.clinic.id)}).data["data"]
        patients = build_doctor_patients_dashboard(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            use_cache=False,
        )
        self.assertEqual(
            practice["practice_summary"]["active_treatments"],
            patients["insights"]["treatment_ongoing"],
        )

    @patch("doctor.api.services.practice_overview_service.cache")
    def test_cache_hit_skips_rebuild(self, mock_cache):
        cached_payload = {
            "generated_at": "2026-06-14T12:00:00+00:00",
            "practice_metrics": {
                "patients_today": 0,
                "patients_this_week": 0,
                "patient_visits_this_month": 0,
                "followups_completed": 0,
                "consultations_completed": 0,
            },
            "consultation_mix": {
                "new_consultations": 0,
                "followup_consultations": 0,
                "cancelled": 0,
                "no_show": 0,
            },
            "practice_summary": {
                "new_patients": 0,
                "returning_patients": 0,
                "active_treatments": 0,
                "patients_under_treatment": 0,
            },
            "recent_trends": [],
            "v2_analytics": {
                "daily_consultations": [],
                "monthly_growth": [],
                "top_diagnoses": [],
                "top_prescribed_medicines": [],
            },
        }
        mock_cache.get.return_value = cached_payload

        result = build_practice_overview(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
        )
        self.assertEqual(result["practice_metrics"], cached_payload["practice_metrics"])
        self.assertNotEqual(result["generated_at"], cached_payload["generated_at"])
        mock_cache.get.assert_called_once()

    @patch("doctor.api.services.practice_overview_service._iso_generated_at")
    @patch("doctor.api.services.practice_overview_service.cache")
    def test_cache_hit_refreshes_generated_at(self, mock_cache, mock_generated_at):
        cached_payload = {
            "generated_at": "2026-06-14T12:00:00+00:00",
            "practice_metrics": {
                "patients_today": 1,
                "patients_this_week": 1,
                "patient_visits_this_month": 1,
                "followups_completed": 0,
                "consultations_completed": 1,
            },
            "consultation_mix": {
                "new_consultations": 0,
                "followup_consultations": 0,
                "cancelled": 0,
                "no_show": 0,
            },
            "practice_summary": {
                "new_patients": 1,
                "returning_patients": 0,
                "active_treatments": 0,
                "patients_under_treatment": 0,
            },
            "recent_trends": [],
            "v2_analytics": {
                "daily_consultations": [],
                "monthly_growth": [],
                "top_diagnoses": [],
                "top_prescribed_medicines": [],
            },
        }
        mock_cache.get.return_value = cached_payload
        mock_generated_at.return_value = "2026-06-14T12:00:15+00:00"

        result = build_practice_overview(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
        )

        self.assertEqual(result["generated_at"], "2026-06-14T12:00:15+00:00")
        self.assertEqual(result["practice_metrics"]["patients_today"], 1)

    def test_cache_miss_query_budget(self):
        with CaptureQueriesContext(connection) as context:
            build_practice_overview(
                doctor_id=self.doctor.id,
                clinic_id=self.clinic.id,
                use_cache=False,
            )
        self.assertLessEqual(len(context.captured_queries), 6)
