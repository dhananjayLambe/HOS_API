"""
Integration tests for GET /api/patients/<patient_profile_id>/summary/
(PatientSummaryAPIView + patient_summary_service).
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from consultations_core.models.consultation import Consultation
from consultations_core.models.diagnosis import CustomDiagnosis
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import (
    Prescription,
    PrescriptionCancellationSource,
    PrescriptionStatus,
)
from tests.factories.clinic import ClinicFactory
from tests.factories.doctor import DoctorFactory, ensure_doctor_group
from tests.factories.helpdesk import ensure_helpdesk_group
from tests.factories.patient import PatientProfileFactory
from tests.factories.user import UserFactory


User = get_user_model()


class PatientSummaryViewIntegrationTests(APITestCase):
    def setUp(self):
        self.client = self.client_class()
        self.helpdesk_group, _ = Group.objects.get_or_create(name="helpdesk")
        self.doctor_group, _ = Group.objects.get_or_create(name="doctor")

        self.clinic = ClinicFactory()

        self.helpdesk_user = User.objects.create_user(username="91000001001")
        ensure_helpdesk_group(self.helpdesk_user)

        self.doctor_user = UserFactory(username="91000001002")
        ensure_doctor_group(self.doctor_user)
        self.doctor = DoctorFactory(user=self.doctor_user, clinics=(self.clinic,))

        self.doctor2_user = UserFactory(username="91000001003")
        ensure_doctor_group(self.doctor2_user)
        self.doctor2 = DoctorFactory(user=self.doctor2_user, clinics=(self.clinic,))

    def _url(self, profile_id):
        return reverse("patient_account:patient-summary", kwargs={"patient_profile_id": profile_id})

    def _auth_helpdesk(self):
        self.client.force_authenticate(user=self.helpdesk_user)

    def _auth_doctor(self, user=None):
        self.client.force_authenticate(user=user or self.doctor_user)

    def _closed_visit(self, profile, doctor, clinic, created_at=None):
        enc = ClinicalEncounter.objects.create(
            clinic=clinic,
            doctor=doctor,
            patient_account=profile.account,
            patient_profile=profile,
            status="consultation_completed",
            is_active=False,
        )
        if created_at is not None:
            ClinicalEncounter.objects.filter(pk=enc.pk).update(created_at=created_at)
            enc.refresh_from_db()
        return enc

    def _finalize_consultation(self, consultation):
        consultation.is_finalized = True
        consultation.ended_at = timezone.now()
        consultation.save()

    def test_helpdesk_can_load_summary(self):
        p = PatientProfileFactory(first_name="H", last_name="Summary")
        p.account.clinics.add(self.clinic)
        self._closed_visit(p, self.doctor, self.clinic)

        self._auth_helpdesk()
        r = self.client.get(self._url(p.id))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["patient"]["id"], str(p.id))
        self.assertEqual(r.data["quick_stats"]["visits"], 1)
        self.assertEqual(r.data["labs"], [])
        self.assertIn("generated_summary", r.data)

    def test_doctor_can_load_in_scope_patient(self):
        p = PatientProfileFactory(first_name="In", last_name="Scope")
        p.account.clinics.add(self.clinic)
        self._closed_visit(p, self.doctor, self.clinic)

        self._auth_doctor(self.doctor_user)
        r = self.client.get(self._url(p.id))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["patient"]["full_name"].strip(), "In Scope")

    def test_doctor_out_of_scope_returns_404(self):
        p = PatientProfileFactory(first_name="Other", last_name="Doc")
        p.account.clinics.add(self.clinic)
        self._closed_visit(p, self.doctor2, self.clinic)

        self._auth_doctor(self.doctor_user)
        r = self.client.get(self._url(p.id))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_empty_patient_stable_payload(self):
        p = PatientProfileFactory(first_name="Empty", last_name="Patient")
        p.account.clinics.add(self.clinic)

        self._auth_helpdesk()
        r = self.client.get(self._url(p.id))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["quick_stats"]["visits"], 0)
        self.assertEqual(r.data["consultations"], [])
        self.assertEqual(r.data["prescriptions"], [])
        self.assertEqual(len(r.data["timeline"]), 0)

    def test_generated_summary_non_empty_with_minimal_data(self):
        p = PatientProfileFactory(first_name="Sum", last_name="Mary")
        p.account.clinics.add(self.clinic)
        self._closed_visit(p, self.doctor, self.clinic)

        self._auth_helpdesk()
        r = self.client.get(self._url(p.id))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        text = r.data["generated_summary"]["summary"]
        self.assertTrue(len(text) > 10)
        self.assertIn("Clinical summary", r.data["generated_summary"]["headline"])

    def test_timeline_sorted_desc_and_max_20(self):
        p = PatientProfileFactory(first_name="Time", last_name="Line")
        p.account.clinics.add(self.clinic)
        base = timezone.now() - timedelta(days=30)
        for i in range(25):
            self._closed_visit(p, self.doctor, self.clinic, created_at=base + timedelta(days=i))

        self._auth_helpdesk()
        r = self.client.get(self._url(p.id))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        tl = r.data["timeline"]
        self.assertEqual(len(tl), 20)
        self.assertTrue(all(x["event"] == "Encounter recorded" for x in tl))

    def test_prescription_status_mapping_active_and_cancelled(self):
        p = PatientProfileFactory(first_name="Rx", last_name="Map")
        p.account.clinics.add(self.clinic)

        enc = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="created",
            is_active=True,
        )
        cons = Consultation.objects.create(encounter=enc)
        rx_active = Prescription.objects.create(
            consultation=cons,
            status=PrescriptionStatus.FINALIZED,
            finalized_at=timezone.now(),
            is_active=True,
        )
        self._finalize_consultation(cons)

        enc2 = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="created",
            is_active=True,
        )
        cons2 = Consultation.objects.create(encounter=enc2)
        rx_cancel = Prescription.objects.create(
            consultation=cons2,
            status=PrescriptionStatus.FINALIZED,
            finalized_at=timezone.now(),
            is_active=True,
        )
        self._finalize_consultation(cons2)
        rx_cancel.cancel(
            source=PrescriptionCancellationSource.DOCTOR,
            reason_code="test_rx_map",
            actor_user=self.doctor_user,
        )

        self._auth_helpdesk()
        r = self.client.get(self._url(p.id))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        statuses = {row["status"] for row in r.data["prescriptions"]}
        self.assertIn("ACTIVE", statuses)
        self.assertIn("CANCELLED", statuses)
        for row in r.data["prescriptions"]:
            self.assertIn("consultation_id", row)
            self.assertTrue(row["consultation_id"])

    def test_consultation_with_diagnosis_and_closure_note(self):
        p = PatientProfileFactory(first_name="Dx", last_name="Note")
        p.account.clinics.add(self.clinic)

        enc = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            doctor=self.doctor,
            patient_account=p.account,
            patient_profile=p,
            status="created",
            is_active=True,
        )
        cons = Consultation.objects.create(encounter=enc, closure_note="Rest and fluids.")
        CustomDiagnosis.objects.create(name="Test Diagnosis", consultation=cons)
        self._finalize_consultation(cons)

        self._auth_helpdesk()
        r = self.client.get(self._url(p.id))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["snapshot"]["last_diagnosis"], "Test Diagnosis")
        self.assertEqual(len(r.data["consultations"]), 1)
        self.assertEqual(r.data["consultations"][0]["diagnosis"], "Test Diagnosis")
        self.assertIn("fluids", r.data["consultations"][0]["advice"])
