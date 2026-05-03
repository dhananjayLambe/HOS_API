"""End-to-end: appointment → check-in → queue → vitals → consultation → complete.

Run:
  python manage.py test appointments.tests.test_appointment_e2e_flow -v2

Encounter statuses use consultations_core canonical values; queue uses waiting /
vitals_done / in_consultation / completed.
"""

from datetime import datetime, time, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from appointments.models import Appointment
from clinic.models import Clinic
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from doctor.models import doctor as DoctorModel
from helpdesk.models import HelpdeskClinicUser
from patient_account.models import PatientAccount, PatientProfile
from queue_management.models import Queue
from tests.helpers.realtime_mock import mock_queue_realtime

User = get_user_model()


def _uniq_reg():
    from uuid import uuid4

    return f"REG-{uuid4().hex[:12]}"


def _minimal_end_consultation_payload():
    return {
        "mode": "commit",
        "store": {
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
        },
    }


def _doctor_client(doc_user):
    g, _ = Group.objects.get_or_create(name="doctor")
    doc_user.groups.add(g)
    c = APIClient()
    c.force_authenticate(user=doc_user)
    return c


class FullJourneyE2ETests(TestCase):
    """Single-threaded API chain with realtime mocked."""

    def setUp(self):
        self.clinic = Clinic.objects.create(
            name=f"E2E Clinic {_uniq_reg()[:6]}",
            registration_number=_uniq_reg(),
        )
        g_h, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user = User.objects.create_user(
            username=f"hd_{_uniq_reg()[:10]}",
            password="pass12345",
        )
        self.helpdesk_user.groups.add(g_h)
        HelpdeskClinicUser.objects.create(
            user=self.helpdesk_user,
            clinic=self.clinic,
            is_active=True,
        )

        self.doc_user = User.objects.create_user(
            username=f"doc_{_uniq_reg()[:10]}",
            password="pass12345",
            first_name="Ann",
            last_name="Smith",
        )
        self.doctor = DoctorModel.objects.create(
            user=self.doc_user,
            primary_specialization="general",
            is_approved=True,
        )
        self.doctor.clinics.add(self.clinic)

        g_pat, _ = Group.objects.get_or_create(name="patient")
        self.pat_user = User.objects.create_user(
            username=f"pat_{_uniq_reg()[:10]}",
            password="pass12345",
        )
        self.pat_user.groups.add(g_pat)
        self.account = PatientAccount.objects.create(user=self.pat_user)
        self.account.clinics.add(self.clinic)
        self.profile = PatientProfile.objects.create(
            account=self.account,
            first_name="Pat",
            last_name="Client",
            relation="self",
            gender="male",
            age_years=30,
        )

        self.helpdesk_client = APIClient()
        self.helpdesk_client.force_authenticate(user=self.helpdesk_user)

    def _booking_today_after_now(self):
        """Local calendar today + slot strictly in the future (create + same-day check-in).

        Date/time must be derived from ``timezone.localtime(...)`` so we never mix a UTC
        ``.time()`` with ``timezone.localdate()`` (that mismatch caused false "clock skew" skips).
        """
        tz = timezone.get_current_timezone()
        now = timezone.now()
        slot_start_aware = now + timedelta(minutes=45)
        slot_end_aware = now + timedelta(minutes=75)
        local_start = timezone.localtime(slot_start_aware, tz)
        local_end = timezone.localtime(slot_end_aware, tz)
        today = timezone.localdate()
        if local_start.date() != today or local_end.date() != today:
            self.skipTest("Day boundary: appointment would fall on next calendar day")
        appointment_date = local_start.date()
        st = local_start.time().replace(microsecond=0)
        et = local_end.time().replace(microsecond=0)
        appointment_dt = timezone.make_aware(
            datetime.combine(appointment_date, st),
            tz,
        )
        if appointment_dt <= now:
            self.skipTest("Clock skew: could not build a future slot on local today")
        return appointment_date, st, et

    def _create_appointment(self):
        d, s, e = self._booking_today_after_now()
        url = reverse("appointments:appointment-create")
        body = {
            "patient_account_id": str(self.account.id),
            "patient_profile_id": str(self.profile.id),
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "appointment_date": d.isoformat(),
            "slot_start_time": s.strftime("%H:%M:%S"),
            "slot_end_time": e.strftime("%H:%M:%S"),
            "consultation_mode": "clinic",
            "appointment_type": "new",
            "consultation_fee": "100.00",
            "notes": "",
        }
        with mock_queue_realtime():
            with self.captureOnCommitCallbacks(execute=True):
                r = self.helpdesk_client.post(url, body, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        return Appointment.objects.get(id=r.data["id"]), d

    def test_full_journey_appointment_to_completion(self):
        appt, _appt_date = self._create_appointment()

        check_url = reverse("appointments:appointment-check-in", kwargs={"pk": appt.id})
        with mock_queue_realtime() as rt:
            with self.captureOnCommitCallbacks(execute=True):
                r_in = self.helpdesk_client.post(check_url, {}, format="json")
        self.assertEqual(r_in.status_code, status.HTTP_200_OK, r_in.data)
        encounter_id = r_in.data["encounter_id"]
        self.assertTrue(rt.sync.called)

        enc = ClinicalEncounter.objects.get(id=encounter_id)
        self.assertEqual(enc.status, "created")
        self.assertEqual(enc.appointment_id, appt.id)

        q = Queue.objects.get(appointment_id=appt.id)
        self.assertEqual(q.status, "waiting")
        self.assertEqual(q.encounter_id, enc.id)
        self.assertEqual(q.position_in_queue, 1)

        appt.refresh_from_db()
        self.assertEqual(appt.status, "checked_in")

        vitals_url = reverse("visit-vitals", kwargs={"visit_id": encounter_id})
        with mock_queue_realtime():
            rv = self.helpdesk_client.post(
                vitals_url,
                {"bp_systolic": 120, "bp_diastolic": 80, "weight": 70.0},
                format="json",
            )
        self.assertEqual(rv.status_code, status.HTTP_200_OK, rv.data)
        q.refresh_from_db()
        enc.refresh_from_db()
        self.assertEqual(q.status, "vitals_done")
        self.assertEqual(enc.status, "pre_consultation_in_progress")

        doc_client = _doctor_client(self.doc_user)
        start_url = reverse("queue-start")
        with mock_queue_realtime():
            rs = doc_client.patch(
                start_url,
                {"queue_id": str(q.id), "clinic_id": str(self.clinic.id)},
                format="json",
            )
        self.assertEqual(rs.status_code, status.HTTP_200_OK, rs.data)
        q.refresh_from_db()
        enc.refresh_from_db()
        self.assertEqual(q.status, "in_consultation")
        self.assertEqual(enc.status, "consultation_in_progress")
        self.assertTrue(Consultation.objects.filter(encounter=enc).exists())

        complete_url = reverse("consultation-complete", kwargs={"encounter_id": enc.id})
        with mock_queue_realtime():
            rc = doc_client.post(complete_url, _minimal_end_consultation_payload(), format="json")
        self.assertEqual(rc.status_code, status.HTTP_200_OK, rc.data)
        enc.refresh_from_db()
        q.refresh_from_db()
        appt.refresh_from_db()
        self.assertEqual(enc.status, "consultation_completed")
        self.assertFalse(enc.is_active)
        self.assertEqual(q.status, "completed")

    def test_encounter_created_on_check_in_status_created(self):
        appt, _ = self._create_appointment()
        url = reverse("appointments:appointment-check-in", kwargs={"pk": appt.id})
        with mock_queue_realtime():
            with self.captureOnCommitCallbacks(execute=True):
                r = self.helpdesk_client.post(url, {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        enc = ClinicalEncounter.objects.get(id=r.data["encounter_id"])
        self.assertEqual(enc.status, "created")

    def test_vitals_then_queue_states(self):
        appt, _ = self._create_appointment()
        with mock_queue_realtime():
            with self.captureOnCommitCallbacks(execute=True):
                self.helpdesk_client.post(
                    reverse("appointments:appointment-check-in", kwargs={"pk": appt.id}),
                    {},
                    format="json",
                )
        q = Queue.objects.get(appointment_id=appt.id)
        enc = ClinicalEncounter.objects.get(id=q.encounter_id)
        with mock_queue_realtime():
            self.helpdesk_client.post(
                reverse("visit-vitals", kwargs={"visit_id": str(enc.id)}),
                {"bp_systolic": 110, "bp_diastolic": 70},
                format="json",
            )
        q.refresh_from_db()
        enc.refresh_from_db()
        self.assertEqual(q.status, "vitals_done")
        self.assertEqual(enc.status, "pre_consultation_in_progress")

        doc_client = _doctor_client(self.doc_user)
        with mock_queue_realtime():
            doc_client.patch(
                reverse("queue-start"),
                {"queue_id": str(q.id), "clinic_id": str(self.clinic.id)},
                format="json",
            )
        q.refresh_from_db()
        enc.refresh_from_db()
        self.assertEqual(q.status, "in_consultation")
        self.assertEqual(enc.status, "consultation_in_progress")

    def test_queue_failure_rolls_back_check_in(self):
        appt, _ = self._create_appointment()
        url = reverse("appointments:appointment-check-in", kwargs={"pk": appt.id})
        with patch(
            "appointments.api.views.appointment.add_to_queue",
            side_effect=IntegrityError("queue fail"),
        ):
            r = self.helpdesk_client.post(url, {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(r.data["all"]["code"], "QUEUE_ERROR")
        appt.refresh_from_db()
        self.assertEqual(appt.status, "scheduled")
        self.assertFalse(Queue.objects.filter(appointment_id=appt.id).exists())
        self.assertEqual(ClinicalEncounter.objects.filter(appointment=appt).count(), 0)

    def test_queue_missing_after_check_in_auto_heals(self):
        appt, _ = self._create_appointment()
        url = reverse("appointments:appointment-check-in", kwargs={"pk": appt.id})
        with mock_queue_realtime():
            with self.captureOnCommitCallbacks(execute=True):
                self.helpdesk_client.post(url, {}, format="json")
        enc = ClinicalEncounter.objects.get(appointment=appt)
        Queue.objects.filter(appointment=appt).delete()
        appt.status = "checked_in"
        appt.save(update_fields=["status"])

        with mock_queue_realtime():
            with self.captureOnCommitCallbacks(execute=True):
                r2 = self.helpdesk_client.post(url, {}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["encounter_id"], str(enc.id))
        self.assertTrue(Queue.objects.filter(appointment_id=appt.id).exists())

    def test_encounter_reused_when_active_encounter_exists(self):
        appt, _ = self._create_appointment()
        existing = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            appointment=None,
            encounter_type="walk_in",
            status="created",
        )
        url = reverse("appointments:appointment-check-in", kwargs={"pk": appt.id})
        with mock_queue_realtime():
            with self.captureOnCommitCallbacks(execute=True):
                r = self.helpdesk_client.post(url, {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["encounter_id"], str(existing.id))
        existing.refresh_from_db()
        self.assertEqual(existing.appointment_id, appt.id)
        self.assertEqual(ClinicalEncounter.objects.filter(appointment=appt).count(), 1)

    def test_patient_cannot_check_in(self):
        appt, _ = self._create_appointment()
        self.helpdesk_client.force_authenticate(user=self.pat_user)
        url = reverse("appointments:appointment-check-in", kwargs={"pk": appt.id})
        r = self.helpdesk_client.post(url, {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_realtime_sync_failure_does_not_break_check_in(self):
        appt, _ = self._create_appointment()
        url = reverse("appointments:appointment-check-in", kwargs={"pk": appt.id})

        def boom(**kwargs):
            raise RuntimeError("redis down")

        with patch("queue_management.services.queue_service._sync_queue_realtime", side_effect=boom):
            with self.captureOnCommitCallbacks(execute=True):
                r = self.helpdesk_client.post(url, {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertTrue(Queue.objects.filter(appointment_id=appt.id).exists())
