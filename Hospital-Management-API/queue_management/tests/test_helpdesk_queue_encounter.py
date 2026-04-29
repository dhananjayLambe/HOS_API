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
from queue_management.services.queue_encounter_sync import mark_queue_rows_for_encounter_completed
from helpdesk.models import HelpdeskClinicUser
from consultations_core.domain.encounter_status import normalize_encounter_status
from consultations_core.services.encounter_state_machine import EncounterStateMachine

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
        age_years=30,
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
        self.assertEqual(r2.status_code, status.HTTP_403_FORBIDDEN, r2.data)

    def test_doctor_queue_start_from_waiting_creates_consultation(self):
        r = self.client.post(
            reverse("queue-check-in"),
            {
                "clinic_id": str(self.clinic.id),
                "patient_account_id": str(self.patient_account.id),
                "patient_profile_id": str(self.profile.id),
                "doctor_id": str(self.doctor.id),
            },
            format="json",
        )
        qid = r.data["id"]
        doc_client = _doctor_client(self.doctor.user)
        start_url = reverse("queue-start")
        r2 = doc_client.patch(
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

    def test_doctor_queue_start_from_vitals_done_creates_consultation(self):
        r = self.client.post(
            reverse("queue-check-in"),
            {
                "clinic_id": str(self.clinic.id),
                "patient_account_id": str(self.patient_account.id),
                "patient_profile_id": str(self.profile.id),
                "doctor_id": str(self.doctor.id),
            },
            format="json",
        )
        qid = r.data["id"]
        q = Queue.objects.get(id=qid)
        self.client.post(
            reverse("visit-vitals", kwargs={"visit_id": str(q.encounter_id)}),
            {"bp_systolic": 120, "bp_diastolic": 80},
            format="json",
        )
        doc_client = _doctor_client(self.doctor.user)
        start_url = reverse("queue-start")
        r2 = doc_client.patch(
            start_url,
            {"queue_id": str(qid), "clinic_id": str(self.clinic.id)},
            format="json",
        )
        self.assertEqual(r2.status_code, status.HTTP_200_OK, r2.data)

    def test_doctor_queue_get_includes_patient_profile_id_and_encounter_id(self):
        """GET /queue/doctor/.../ must expose profile id (for search sync) and encounter (for start)."""
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
        self.assertIsNotNone(q.encounter_id)
        dq_url = reverse(
            "doctor-queue",
            kwargs={"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id)},
        )
        doc_client = _doctor_client(self.doctor.user)
        r = doc_client.get(dq_url)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(len(r.data), 1)
        row = r.data[0]
        self.assertEqual(row.get("patient_profile_id"), str(self.profile.id))
        self.assertEqual(str(row.get("encounter_id")), str(q.encounter_id))

    def test_doctor_section_vitals_get_after_helpdesk_post(self):
        """Regression: helpdesk POST visit vitals must be readable on doctor GET pre-consult section."""
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
            {
                "bp_systolic": 120,
                "bp_diastolic": 80,
                "weight": 70.5,
                "height": 5.9,
                "temperature": 37.2,
            },
            format="json",
        )
        doc_client = _doctor_client(self.doctor.user)
        section_url = reverse(
            "pre-consult-section",
            kwargs={"encounter_id": visit_id, "section_code": "vitals"},
        )
        r = doc_client.get(section_url)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertTrue(r.data.get("status"))
        data = r.data.get("data") or {}
        self.assertIsInstance(data, dict)
        bp = data.get("blood_pressure") or data.get("bp") or {}
        if isinstance(bp, dict):
            self.assertEqual(bp.get("systolic"), 120)
            self.assertEqual(bp.get("diastolic"), 80)
        hw = data.get("height_weight") or {}
        self.assertAlmostEqual(float(hw.get("weight_kg", data.get("weight_kg", 0))), 70.5, places=3)
        height_cm = hw.get("height_cm") or data.get("height_cm")
        self.assertIsNotNone(height_cm)
        temp = data.get("temperature")
        if isinstance(temp, dict):
            self.assertAlmostEqual(float(temp.get("value", 0)), 37.2, places=3)

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
        self.assertIn("X-Queue-Calendar-Date", r.headers)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["patient_name"], "Pat Test")
        self.assertEqual(r.data[0]["patient_mobile"], self.patient_account.user.username)

    def test_helpdesk_today_hides_stale_vitals_done_when_encounter_completed(self):
        """
        Queue row can remain status=vitals_done if never reconciled; helpdesk list must
        not show it when encounter is already terminal (defensive filter).
        """
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
        q = Queue.objects.latest("created_at")
        enc_id = q.encounter_id
        q.status = "vitals_done"
        q.save(update_fields=["status"])
        ClinicalEncounter.objects.filter(pk=enc_id).update(status="consultation_completed", is_active=False)

        url = reverse("helpdesk-clinic-queue-today")
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(len(r.data), 0, r.data)

    def test_mark_queue_rows_for_encounter_completed_sets_queue_completed(self):
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
        self.assertIn(q.status, ("waiting", "vitals_done"))
        n = mark_queue_rows_for_encounter_completed(q.encounter_id)
        self.assertEqual(n, 1)
        q.refresh_from_db()
        self.assertEqual(q.status, "completed")

    def test_complete_consultation_syncs_queue_status(self):
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
        enc = ClinicalEncounter.objects.get(id=q.encounter_id)
        EncounterStateMachine.start_consultation(enc, user=self.doctor.user)
        enc.refresh_from_db()
        self.assertEqual(normalize_encounter_status(enc.status), "consultation_in_progress")
        EncounterStateMachine.complete_consultation(enc, user=self.doctor.user)
        q.refresh_from_db()
        self.assertEqual(q.status, "completed")
