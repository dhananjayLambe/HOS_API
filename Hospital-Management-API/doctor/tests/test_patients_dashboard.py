"""Integration tests for GET /api/v1/doctors/dashboard/patients/."""

from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from consultations_core.models.consultation import Consultation
from consultations_core.models.diagnosis import CustomDiagnosis
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.follow_up import FollowUp
from doctor.api.services.patients_dashboard_service import (
    ACTIVE_VISIT_DAYS,
    build_doctor_patients_dashboard,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.patient import PatientProfileFactory
from tests.factories.user import UserFactory


class DoctorPatientsDashboardIntegrationTests(APITestCase):
    def setUp(self):
        self.url = reverse("doctor_dashboard:dashboard-patients")
        self.clinic = ClinicFactory()
        self.clinic_b = ClinicFactory()

        self.doctor_user = UserFactory(username="91000001001")
        ensure_doctor_group(self.doctor_user)
        self.doctor = DoctorFactory(user=self.doctor_user, clinics=(self.clinic,))

        self.other_doctor_user = UserFactory(username="91000001002")
        ensure_doctor_group(self.other_doctor_user)
        self.other_doctor = DoctorFactory(user=self.other_doctor_user, clinics=(self.clinic,))

        self.helpdesk_user = UserFactory(username="91000001003")
        helpdesk_group, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user.groups.add(helpdesk_group)

    def _auth_doctor(self):
        self.client.force_authenticate(user=self.doctor_user)

    def _closed_visit(self, profile, doctor, clinic, *, created_at=None, status_value="consultation_completed"):
        enc = ClinicalEncounter.objects.create(
            clinic=clinic,
            doctor=doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="created",
            is_active=True,
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

    def test_returns_recent_patients_with_total_visits(self):
        profile = PatientProfileFactory(first_name="Rachana", last_name="Lambe")
        now = timezone.now()
        self._closed_visit(profile, self.doctor, self.clinic, created_at=now)
        self._closed_visit(profile, self.doctor, self.clinic, created_at=now - timedelta(days=3))

        self._auth_doctor()
        response = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id), "page_size": 10},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["recent_patients"]["count"], 1)
        row = data["recent_patients"]["results"][0]
        self.assertEqual(row["patient_name"], "Rachana Lambe")
        self.assertEqual(row["total_visits"], 2)
        self.assertEqual(row["risk_level"], "LOW")

    def test_clinic_scoping_excludes_other_clinic_patients(self):
        profile_a = PatientProfileFactory(first_name="Clinic", last_name="A")
        profile_b = PatientProfileFactory(first_name="Clinic", last_name="B")
        self._closed_visit(profile_a, self.doctor, self.clinic)
        self._closed_visit(profile_b, self.doctor, self.clinic_b)

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [r["patient_name"] for r in response.data["data"]["recent_patients"]["results"]]
        self.assertIn("Clinic A", names)
        self.assertNotIn("Clinic B", names)

    def test_active_status_uses_30_day_window(self):
        profile_active = PatientProfileFactory(first_name="Active", last_name="Patient")
        profile_stable = PatientProfileFactory(first_name="Stable", last_name="Patient")
        today = timezone.now()
        self._closed_visit(
            profile_active,
            self.doctor,
            self.clinic,
            created_at=today - timedelta(days=20),
        )
        self._closed_visit(
            profile_stable,
            self.doctor,
            self.clinic,
            created_at=today - timedelta(days=ACTIVE_VISIT_DAYS + 5),
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        rows = {r["patient_name"]: r["status"] for r in response.data["data"]["recent_patients"]["results"]}
        self.assertEqual(rows["Active Patient"], "ACTIVE")
        self.assertEqual(rows["Stable Patient"], "STABLE")

    def test_follow_up_due_status_priority(self):
        profile = PatientProfileFactory(first_name="Follow", last_name="Up")
        enc, consultation = self._closed_visit(
            profile,
            self.doctor,
            self.clinic,
            created_at=timezone.now() - timedelta(days=2),
        )
        FollowUp.objects.create(
            consultation=consultation,
            follow_up_type=FollowUp.FollowUpType.EXACT_DATE,
            follow_up_date=date.today() - timedelta(days=3),
            is_completed=False,
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        row = response.data["data"]["recent_patients"]["results"][0]
        self.assertEqual(row["status"], "FOLLOW_UP_DUE")

    def test_followup_widget_includes_days_overdue(self):
        profile = PatientProfileFactory(first_name="Amit", last_name="Patil")
        enc, consultation = self._closed_visit(
            profile,
            self.doctor,
            self.clinic,
            created_at=timezone.now() - timedelta(days=15),
        )
        overdue_date = date.today() - timedelta(days=5)
        FollowUp.objects.create(
            consultation=consultation,
            follow_up_type=FollowUp.FollowUpType.EXACT_DATE,
            follow_up_date=overdue_date,
            is_completed=False,
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        widget = response.data["data"]["followup_patients"]
        self.assertEqual(len(widget), 1)
        self.assertEqual(widget[0]["patient_name"], "Amit Patil")
        self.assertEqual(widget[0]["days_overdue"], 5)
        self.assertEqual(widget[0]["last_visit_days"], 15)

    def test_diagnosis_from_custom_diagnosis(self):
        profile = PatientProfileFactory(first_name="Dx", last_name="Patient")
        enc, consultation = self._closed_visit(profile, self.doctor, self.clinic)
        CustomDiagnosis.objects.create(
            consultation=consultation,
            name="Viral Fever",
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        row = response.data["data"]["recent_patients"]["results"][0]
        self.assertEqual(row["diagnosis"], "Viral Fever")

    def test_insights_patients_seen_today(self):
        profile = PatientProfileFactory()
        self._closed_visit(profile, self.doctor, self.clinic, created_at=timezone.now())

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        self.assertEqual(response.data["data"]["insights"]["patients_seen_today"], 1)

    @patch("doctor.api.services.patients_dashboard_service.cache")
    def test_cache_hit_skips_rebuild(self, mock_cache):
        cached_payload = {
            "insights": {
                "patients_seen_today": 0,
                "followup_due": 0,
                "treatment_ongoing": 0,
                "pending_reports": 0,
            },
            "recent_patients": {"count": 0, "results": []},
            "followup_patients": [],
        }
        mock_cache.get.return_value = cached_payload

        result = build_doctor_patients_dashboard(
            doctor_id=self.doctor.id,
            clinic_id=self.clinic.id,
            page=1,
            page_size=10,
        )
        self.assertEqual(result, cached_payload)
        mock_cache.get.assert_called_once()

    def test_page_size_allowed_values(self):
        self._auth_doctor()
        for size in (5, 10, 25, 50):
            response = self.client.get(
                self.url,
                {"clinic_id": str(self.clinic.id), "page_size": size},
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_recent_patient_open_encounter_in_queue(self):
        profile = PatientProfileFactory(first_name="Queue", last_name="Patient")
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="created",
            is_active=True,
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        row = response.data["data"]["recent_patients"]["results"][0]
        self.assertTrue(row["has_open_encounter"])
        self.assertEqual(row["open_encounter_state"], "in_queue")
        self.assertFalse(row["has_unfinished_consultation"])

    def test_recent_patient_open_encounter_consultation_active(self):
        profile = PatientProfileFactory(first_name="Active", last_name="Consult")
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="in_consultation",
            is_active=True,
        )

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        row = response.data["data"]["recent_patients"]["results"][0]
        self.assertTrue(row["has_open_encounter"])
        self.assertEqual(row["open_encounter_state"], "consultation_active")

    def test_recent_patient_has_unfinished_consultation(self):
        profile = PatientProfileFactory(first_name="Draft", last_name="Consult")
        enc = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="consultation_in_progress",
            is_active=True,
        )
        Consultation.objects.create(encounter=enc, is_finalized=False)

        self._auth_doctor()
        response = self.client.get(self.url, {"clinic_id": str(self.clinic.id)})
        row = response.data["data"]["recent_patients"]["results"][0]
        self.assertTrue(row["has_unfinished_consultation"])

    def test_followup_widget_last_visit_days_when_not_on_recent_page(self):
        followup_profile = PatientProfileFactory(first_name="Old", last_name="FollowUp")
        old_visit_days = 42
        enc, consultation = self._closed_visit(
            followup_profile,
            self.doctor,
            self.clinic,
            created_at=timezone.now() - timedelta(days=old_visit_days),
        )
        FollowUp.objects.create(
            consultation=consultation,
            follow_up_type=FollowUp.FollowUpType.EXACT_DATE,
            follow_up_date=date.today() - timedelta(days=5),
            is_completed=False,
        )

        for i in range(15):
            recent_profile = PatientProfileFactory(first_name=f"Recent{i}", last_name="Patient")
            self._closed_visit(
                recent_profile,
                self.doctor,
                self.clinic,
                created_at=timezone.now() - timedelta(hours=i + 1),
            )

        self._auth_doctor()
        response = self.client.get(
            self.url,
            {"clinic_id": str(self.clinic.id), "page_size": 10},
        )
        recent_ids = [r["patient_id"] for r in response.data["data"]["recent_patients"]["results"]]
        self.assertNotIn(str(followup_profile.id), recent_ids)

        widget = response.data["data"]["followup_patients"]
        self.assertEqual(len(widget), 1)
        self.assertEqual(widget[0]["patient_name"], "Old FollowUp")
        self.assertEqual(widget[0]["last_visit_days"], old_visit_days)
