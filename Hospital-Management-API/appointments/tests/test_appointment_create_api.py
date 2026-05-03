"""POST /api/appointments/ — create validation (past, future limit, slot conflict, success).

Run:
  python manage.py test appointments.tests.test_appointment_create_api -v2
"""

from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from appointments.models import Appointment
from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from helpdesk.models import HelpdeskClinicUser
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _uniq_reg():
    return f"REG-{uuid.uuid4().hex[:12]}"


class AppointmentCreateAPITests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name="Create Clinic",
            registration_number=_uniq_reg(),
        )
        g_h, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user = User.objects.create_user(
            username=f"hd_{User.objects.count()}_{_uniq_reg()[:8]}",
            password="pass12345",
        )
        self.helpdesk_user.groups.add(g_h)
        HelpdeskClinicUser.objects.create(
            user=self.helpdesk_user,
            clinic=self.clinic,
            is_active=True,
        )

        self.doc_user = User.objects.create_user(
            username=f"doc_{User.objects.count()}_{_uniq_reg()[:8]}",
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
            username=f"pat_{User.objects.count()}_{_uniq_reg()[:8]}",
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

        self.client = APIClient()
        self.client.force_authenticate(user=self.helpdesk_user)
        self.url = reverse("appointments:appointment-create")

    def _future_slot_today(self):
        """Return (date, start, end) on local today strictly after now()."""
        today = timezone.localdate()
        now = timezone.now()
        future_dt = now + timedelta(hours=3)
        if future_dt.date() != today:
            start = time(10, 0, 0)
            end = time(10, 30, 0)
            return today + timedelta(days=1), start, end
        t = future_dt.time().replace(microsecond=0)
        start_h, start_m, start_s = t.hour, t.minute, t.second
        start = time(start_h, start_m, max(start_s, 0))
        end_dt = future_dt + timedelta(minutes=30)
        et = end_dt.time().replace(microsecond=0)
        end = time(et.hour, et.minute, et.second)
        return today, start, end

    def _body(self, appointment_date, slot_start, slot_end, **kw):
        return {
            "patient_account_id": str(self.account.id),
            "patient_profile_id": str(self.profile.id),
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
            "appointment_date": appointment_date.isoformat(),
            "slot_start_time": slot_start.strftime("%H:%M:%S"),
            "slot_end_time": slot_end.strftime("%H:%M:%S"),
            "consultation_mode": kw.get("consultation_mode", "clinic"),
            "appointment_type": kw.get("appointment_type", "new"),
            "consultation_fee": kw.get("consultation_fee", "100.00"),
            "notes": kw.get("notes", ""),
        }

    def test_create_valid_returns_201(self):
        d, s, e = self._future_slot_today()
        r = self.client.post(self.url, self._body(d, s, e), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(r.data.get("status"), "scheduled")
        self.assertIn("id", r.data)
        appt = Appointment.objects.get(id=r.data["id"])
        self.assertEqual(appt.patient_account_id, self.account.id)
        self.assertEqual(appt.clinic_id, self.clinic.id)

    def test_create_past_datetime_returns_PAST_TIME(self):
        past = timezone.localdate() - timedelta(days=2)
        r = self.client.post(
            self.url,
            self._body(past, time(10, 0, 0), time(10, 30, 0)),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        err = r.data.get("appointment_date")
        if isinstance(err, list):
            err = err[0]
        self.assertEqual(err["code"], "PAST_TIME")

    @override_settings(MAX_BOOKING_DAYS=30)
    def test_create_beyond_future_limit_returns_FUTURE_LIMIT_EXCEEDED(self):
        far = timezone.localdate() + timedelta(days=35)
        r = self.client.post(
            self.url,
            self._body(far, time(10, 0, 0), time(10, 30, 0)),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        err = r.data.get("appointment_date")
        if isinstance(err, list):
            err = err[0]
        self.assertEqual(err["code"], "FUTURE_LIMIT_EXCEEDED")

    def test_create_slot_conflict_returns_SLOT_CONFLICT(self):
        d, s, e = self._future_slot_today()
        Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=d,
            slot_start_time=s,
            slot_end_time=e,
            status="scheduled",
        )
        r = self.client.post(self.url, self._body(d, s, e), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        err = r.data.get("slot_start_time")
        if isinstance(err, list):
            err = err[0]
        self.assertEqual(err["code"], "SLOT_CONFLICT")
