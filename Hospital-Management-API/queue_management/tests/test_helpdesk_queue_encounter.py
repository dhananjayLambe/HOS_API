"""Queue check-in ↔ encounter linkage and vitals lifecycle (helpdesk + doctor continuity)."""

import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinic.models import Clinic
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile
from queue_management.models import Queue
from helpdesk.models import HelpdeskClinicUser

User = get_user_model()


def _helpdesk_client():
    g, _ = Group.objects.get_or_create(name="helpdesk")
    u = User.objects.create_user(
        username=f"hq_{uuid.uuid4().hex[:10]}",
        password="pass12345",
        first_name="Help",
        last_name="Desk",
    )
    u.groups.add(g)
    c = APIClient()
    c.force_authenticate(user=u)
    return c, u


def _doctor_client(doc_user):
    g, _ = Group.objects.get_or_create(name="doctor")
    doc_user.groups.add(g)
    c = APIClient()
    c.force_authenticate(user=doc_user)
    return c


def _doctor_and_patient(clinic):
    doc_user = User.objects.create_user(
        username=f"doc_{uuid.uuid4().hex[:10]}",
        password="pass12345",
        first_name="Doc",
        last_name="Test",
    )
    doc = DoctorModel.objects.create(user=doc_user, primary_specialization="general", is_approved=True)
    doc.clinics.add(clinic)

    pat_user = User.objects.create_user(
        username=f"pat_{uuid.uuid4().hex[:10]}",
        password="pass12345",
        first_name="Pat",
        last_name="Test",
    )
    acct = PatientAccount.objects.create(user=pat_user)
    acct.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=acct,
        first_name="Pat",
        last_name="Test",
        relation="self",
        gender="male",
    )
    return doc, acct, profile


class HelpdeskQueueEncounterTests(TestCase):
    def setUp(self):
        self.client, self.helpdesk_user = _helpdesk_client()
        self.clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
        self.doctor, self.patient_account, self.profile = _doctor_and_patient(self.clinic)

    def test_check_in_links_encounter_and_returns_visit_id(self):
        url = reverse("queue-check-in")
        payload = {
            "clinic_id": str(self.clinic.id),
            "patient_account_id": str(self.patient_account.id),
            "patient_profile_id": str(self.profile.id),
            "doctor_id": str(self.doctor.id),
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertIsNotNone(resp.data.get("visit_id"))
        q = Queue.objects.get(id=resp.data["id"])
        self.assertIsNotNone(q.encounter_id)
        self.assertEqual(str(q.encounter_id), resp.data["visit_id"])
        enc = ClinicalEncounter.objects.get(id=q.encounter_id)
        self.assertTrue(enc.visit_pnr and len(enc.visit_pnr) > 3)

    def test_vitals_save_moves_encounter_to_pre_consultation_in_progress(self):
        url = reverse("queue-check-in")
        self.client.post(
            url,
            {
                "clinic_id": str(self.clinic.id),
                "patient_account_id": str(self.patient_account.id),
                "patient_profile_id": str(self.profile.id),
                "doctor_id": str(self.doctor.id),
            },
            format="json",
        )
        q = Queue.objects.latest("created_at")
        visit_id = str(q.encounter_id)
        self.assertEqual(q.encounter.status, "created")

        vitals_url = reverse("visit-vitals", kwargs={"visit_id": visit_id})
        r2 = self.client.post(
            vitals_url,
            {"bp_systolic": 120, "bp_diastolic": 80, "weight": 70.0},
            format="json",
        )
        self.assertEqual(r2.status_code, status.HTTP_200_OK, r2.data)
        q.refresh_from_db()
        self.assertEqual(q.status, "vitals_done")
        enc = ClinicalEncounter.objects.get(id=q.encounter_id)
        self.assertEqual(enc.status, "pre_consultation_in_progress")

    def test_queue_start_creates_consultation_for_linked_encounter(self):
        url = reverse("queue-check-in")
        r = self.client.post(
            url,
            {
                "clinic_id": str(self.clinic.id),
                "patient_account_id": str(self.patient_account.id),
                "patient_profile_id": str(self.profile.id),
                "doctor_id": str(self.doctor.id),
            },
            format="json",
        )
        qid = r.data["id"]
        start_url = reverse("queue-start")
        r2 = self.client.patch(
            start_url,
            {"queue_id": str(qid), "clinic_id": str(self.clinic.id)},
            format="json",
        )
        self.assertEqual(r2.status_code, status.HTTP_200_OK, r2.data)
        q = Queue.objects.get(id=qid)
        self.assertEqual(q.status, "in_consultation")
        enc = ClinicalEncounter.objects.get(id=q.encounter_id)
        self.assertTrue(Consultation.objects.filter(encounter=enc).exists())
        self.assertEqual(enc.status, "consultation_in_progress")

    def test_doctor_preview_sees_helpdesk_vitals_same_encounter_and_pnr(self):
        self.client.post(
            reverse("queue-check-in"),
            {
                "clinic_id": str(self.clinic.id),
                "patient_account_id": str(self.patient_account.id),
                "patient_profile_id": str(self.profile.id),
                "doctor_id": str(self.doctor.id),
            },
            format="json",
        )
        q = Queue.objects.latest("created_at")
        visit_id = str(q.encounter_id)
        pnr_before = ClinicalEncounter.objects.get(id=q.encounter_id).visit_pnr

        self.client.post(
            reverse("visit-vitals", kwargs={"visit_id": visit_id}),
            {"bp_systolic": 118, "bp_diastolic": 76, "weight": 72.0},
            format="json",
        )

        enc = ClinicalEncounter.objects.get(id=q.encounter_id)
        self.assertEqual(enc.visit_pnr, pnr_before)

        doc_client = _doctor_client(self.doctor.user)
        preview = doc_client.get(
            reverse("pre-consultation-preview"),
            {"encounter_id": visit_id},
        )
        self.assertEqual(preview.status_code, status.HTTP_200_OK, preview.data)
        self.assertIn("vitals", preview.data)
        vit = preview.data["vitals"]
        self.assertTrue(vit.get("bp") or vit.get("weight_kg") or vit.get("weight"))

    def test_doctor_queue_lists_visit_id_and_vitals_preview(self):
        self.client.post(
            reverse("queue-check-in"),
            {
                "clinic_id": str(self.clinic.id),
                "patient_account_id": str(self.patient_account.id),
                "patient_profile_id": str(self.profile.id),
                "doctor_id": str(self.doctor.id),
            },
            format="json",
        )
        q = Queue.objects.latest("created_at")
        visit_id = str(q.encounter_id)
        self.client.post(
            reverse("visit-vitals", kwargs={"visit_id": visit_id}),
            {"bp_systolic": 110, "bp_diastolic": 70},
            format="json",
        )

        dq_url = reverse(
            "doctor-queue",
            kwargs={"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id)},
        )
        doc_client = _doctor_client(self.doctor.user)
        r = doc_client.get(dq_url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        row = r.data[0]
        self.assertEqual(row.get("visit_id"), visit_id)
        self.assertIsNotNone(row.get("vitals"))
        self.assertIn("bp", row["vitals"])

    def test_meaningful_vitals_save_does_not_create_second_encounter(self):
        n0 = ClinicalEncounter.objects.filter(patient_profile=self.profile).count()
        self.client.post(
            reverse("queue-check-in"),
            {
                "clinic_id": str(self.clinic.id),
                "patient_account_id": str(self.patient_account.id),
                "patient_profile_id": str(self.profile.id),
                "doctor_id": str(self.doctor.id),
            },
            format="json",
        )
        q = Queue.objects.latest("created_at")
        visit_id = str(q.encounter_id)
        self.assertEqual(
            ClinicalEncounter.objects.filter(patient_profile=self.profile).count(),
            n0 + 1,
        )
        self.client.post(
            reverse("visit-vitals", kwargs={"visit_id": visit_id}),
            {"temperature": 37.1},
            format="json",
        )
        self.assertEqual(
            ClinicalEncounter.objects.filter(patient_profile=self.profile).count(),
            n0 + 1,
        )

    def test_helpdesk_today_queue_requires_clinic_profile(self):
        url = reverse("helpdesk-clinic-queue-today")
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_helpdesk_today_queue_returns_rows_for_clinic(self):
        HelpdeskClinicUser.objects.create(
            user=self.helpdesk_user,
            clinic=self.clinic,
            is_active=True,
        )
        self.client.post(
            reverse("queue-check-in"),
            {
                "clinic_id": str(self.clinic.id),
                "patient_account_id": str(self.patient_account.id),
                "patient_profile_id": str(self.profile.id),
                "doctor_id": str(self.doctor.id),
            },
            format="json",
        )
        url = reverse("helpdesk-clinic-queue-today")
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["patient_name"], "Pat Test")
        self.assertEqual(r.data[0]["patient_mobile"], self.patient_account.user.username)
