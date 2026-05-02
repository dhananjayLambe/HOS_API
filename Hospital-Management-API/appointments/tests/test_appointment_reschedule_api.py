"""PATCH /api/appointments/<id>/reschedule/ — reschedule validation and no-op."""

import uuid
from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from appointments.models import Appointment, AppointmentHistory
from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from helpdesk.models import HelpdeskClinicUser
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _uniq_reg():
    return f"REG-{uuid.uuid4().hex[:12]}"


class AppointmentRescheduleAPITests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name=f"Resched Clinic {uuid.uuid4().hex[:6]}",
            registration_number=_uniq_reg(),
        )
        self.other_clinic = Clinic.objects.create(
            name=f"Other Clinic {uuid.uuid4().hex[:6]}",
            registration_number=_uniq_reg(),
        )

        g_h, _ = Group.objects.get_or_create(name="helpdesk")
        self.helpdesk_user = User.objects.create_user(
            username=f"hd_{uuid.uuid4().hex[:10]}",
            password="pass12345",
            first_name="Help",
            last_name="Desk",
        )
        self.helpdesk_user.groups.add(g_h)
        HelpdeskClinicUser.objects.create(
            user=self.helpdesk_user,
            clinic=self.clinic,
            is_active=True,
        )

        self.doc_user = User.objects.create_user(
            username=f"doc_{uuid.uuid4().hex[:10]}",
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

        self.doc2_user = User.objects.create_user(
            username=f"doc2_{uuid.uuid4().hex[:10]}",
            password="pass12345",
            first_name="Bob",
            last_name="Jones",
        )
        self.doctor2 = DoctorModel.objects.create(
            user=self.doc2_user,
            primary_specialization="general",
            is_approved=True,
        )
        self.doctor2.clinics.add(self.clinic)

        g_pat, _ = Group.objects.get_or_create(name="patient")
        self.pat_user = User.objects.create_user(
            username=f"pat_{uuid.uuid4().hex[:10]}",
            password="pass12345",
            first_name="Pat",
            last_name="Client",
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

        self.today = timezone.localdate()
        self.future_day = self.today + timedelta(days=7)
        self.far_day = self.today + timedelta(days=40)

        self.appt_scheduled = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.future_day,
            slot_start_time=time(10, 0, 0),
            slot_end_time=time(10, 30, 0),
            status="scheduled",
        )

        self.appt_completed = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today - timedelta(days=3),
            slot_start_time=time(9, 0, 0),
            slot_end_time=time(9, 30, 0),
            status="completed",
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.helpdesk_user)

    def _url(self, appt):
        return reverse("appointments:appointment-reschedule", kwargs={"pk": appt.id})

    def _payload(self, doctor, clinic, appointment_date, start, end, **kwargs):
        """Reschedule body; optional kwargs override consultation_mode, appointment_type, consultation_fee, notes."""
        return {
            "doctor_id": str(doctor.id),
            "clinic_id": str(clinic.id),
            "appointment_date": appointment_date.isoformat(),
            "slot_start_time": start.strftime("%H:%M:%S"),
            "slot_end_time": end.strftime("%H:%M:%S"),
            "consultation_mode": kwargs.get("consultation_mode", "clinic"),
            "appointment_type": kwargs.get("appointment_type", "new"),
            "consultation_fee": kwargs.get("consultation_fee", "0.00"),
            "notes": kwargs.get("notes", ""),
        }

    def test_reschedule_valid_success(self):
        new_day = self.future_day + timedelta(days=1)
        body = self._payload(
            self.doctor2,
            self.clinic,
            new_day,
            time(14, 0, 0),
            time(14, 30, 0),
        )
        before = AppointmentHistory.objects.filter(appointment=self.appt_scheduled).count()
        r = self.client.patch(self._url(self.appt_scheduled), body, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["id"], str(self.appt_scheduled.id))
        self.assertEqual(r.data["status"], "scheduled")
        self.assertEqual(r.data["appointment_date"], new_day.isoformat())
        self.appt_scheduled.refresh_from_db()
        self.assertEqual(self.appt_scheduled.doctor_id, self.doctor2.id)
        self.assertEqual(self.appt_scheduled.updated_by_id, self.helpdesk_user.id)
        self.assertEqual(
            AppointmentHistory.objects.filter(appointment=self.appt_scheduled).count(),
            before + 1,
        )
        last = AppointmentHistory.objects.filter(appointment=self.appt_scheduled).first()
        self.assertEqual(last.status, "scheduled")
        self.assertEqual(last.comment, "Rescheduled")

    def test_reschedule_updates_consultation_fee_type_notes(self):
        new_day = self.future_day + timedelta(days=1)
        body = self._payload(
            self.doctor,
            self.clinic,
            new_day,
            time(15, 0, 0),
            time(15, 30, 0),
            consultation_mode="video",
            appointment_type="follow_up",
            consultation_fee="750.50",
            notes="Updated at reschedule",
        )
        r = self.client.patch(self._url(self.appt_scheduled), body, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["consultation_mode"], "video")
        self.assertEqual(r.data["appointment_type"], "follow_up")
        self.assertEqual(r.data["consultation_fee"], "750.50")
        self.assertEqual(r.data["notes"], "Updated at reschedule")
        self.appt_scheduled.refresh_from_db()
        self.assertEqual(self.appt_scheduled.consultation_mode, "video")
        self.assertEqual(self.appt_scheduled.appointment_type, "follow_up")
        self.assertEqual(str(self.appt_scheduled.consultation_fee), "750.50")
        self.assertEqual(self.appt_scheduled.notes, "Updated at reschedule")

    def test_reschedule_same_slot_no_op_no_history(self):
        body = self._payload(
            self.doctor,
            self.clinic,
            self.future_day,
            time(10, 0, 0),
            time(10, 30, 0),
        )
        before = AppointmentHistory.objects.filter(appointment=self.appt_scheduled).count()
        r = self.client.patch(self._url(self.appt_scheduled), body, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["slot_start_time"], "10:00:00")
        self.assertEqual(
            AppointmentHistory.objects.filter(appointment=self.appt_scheduled).count(),
            before,
        )

    def test_reschedule_completed_invalid_status(self):
        body = self._payload(
            self.doctor,
            self.clinic,
            self.today,
            time(12, 0, 0),
            time(12, 30, 0),
        )
        r = self.client.patch(self._url(self.appt_completed), body, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        err = r.data["status"]
        if isinstance(err, list):
            err = err[0]
        self.assertEqual(err["code"], "INVALID_STATUS")

    @override_settings(MAX_BOOKING_DAYS=30)
    def test_reschedule_beyond_range_future_limit(self):
        body = self._payload(
            self.doctor,
            self.clinic,
            self.far_day,
            time(10, 0, 0),
            time(10, 30, 0),
        )
        r = self.client.patch(self._url(self.appt_scheduled), body, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        err = r.data["appointment_date"]
        if isinstance(err, list):
            err = err[0]
        self.assertEqual(err["code"], "FUTURE_LIMIT_EXCEEDED")

    def test_reschedule_slot_conflict(self):
        blocker = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.future_day,
            slot_start_time=time(11, 0, 0),
            slot_end_time=time(11, 30, 0),
            status="scheduled",
        )
        mover = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.future_day,
            slot_start_time=time(12, 0, 0),
            slot_end_time=time(12, 30, 0),
            status="scheduled",
        )
        body = self._payload(
            self.doctor,
            self.clinic,
            self.future_day,
            time(11, 0, 0),
            time(11, 15, 0),
        )
        r = self.client.patch(self._url(mover), body, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        err = r.data["slot_start_time"]
        if isinstance(err, list):
            err = err[0]
        self.assertEqual(err["code"], "SLOT_CONFLICT")
        self.assertTrue(Appointment.objects.filter(id=blocker.id).exists())

    def test_reschedule_past_time(self):
        past_day = self.today - timedelta(days=1)
        body = self._payload(
            self.doctor,
            self.clinic,
            past_day,
            time(10, 0, 0),
            time(10, 30, 0),
        )
        r = self.client.patch(self._url(self.appt_scheduled), body, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        err = r.data["appointment_date"]
        if isinstance(err, list):
            err = err[0]
        self.assertEqual(err["code"], "PAST_TIME")

    def test_reschedule_invalid_doctor_clinic(self):
        body = self._payload(
            self.doctor,
            self.other_clinic,
            self.future_day,
            time(15, 0, 0),
            time(15, 30, 0),
        )
        r = self.client.patch(self._url(self.appt_scheduled), body, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        err = r.data["clinic_id"]
        if isinstance(err, list):
            err = err[0]
        self.assertEqual(err["code"], "INVALID_DOCTOR_CLINIC")

    def test_patient_can_reschedule_own(self):
        self.client.force_authenticate(user=self.pat_user)
        new_day = self.future_day + timedelta(days=2)
        body = self._payload(
            self.doctor,
            self.clinic,
            new_day,
            time(16, 0, 0),
            time(16, 30, 0),
        )
        r = self.client.patch(self._url(self.appt_scheduled), body, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["appointment_date"], new_day.isoformat())
