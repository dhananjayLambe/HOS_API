"""PATCH /api/appointments/<id>/cancel/ — cancel, idempotency, validation."""

import uuid
from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from appointments.models import Appointment, AppointmentHistory
from clinic.models import Clinic
from consultations_core.models.encounter import ClinicalEncounter
from doctor.models import doctor as DoctorModel
from helpdesk.models import HelpdeskClinicUser
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _uniq_reg():
    return f"REG-{uuid.uuid4().hex[:12]}"


class AppointmentCancelAPITests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name=f"Cancel Clinic {uuid.uuid4().hex[:6]}",
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

        self.appt_cancelled = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.future_day + timedelta(days=1),
            slot_start_time=time(11, 0, 0),
            slot_end_time=time(11, 30, 0),
            status="cancelled",
        )

        self.appt_no_show = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today - timedelta(days=1),
            slot_start_time=time(8, 0, 0),
            slot_end_time=time(8, 30, 0),
            status="no_show",
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.helpdesk_user)

    def _url(self, appt):
        return reverse("appointments:appointment-cancel", kwargs={"pk": appt.id})

    def test_cancel_scheduled_success(self):
        before_h = AppointmentHistory.objects.filter(appointment=self.appt_scheduled).count()
        r = self.client.patch(self._url(self.appt_scheduled), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["id"], str(self.appt_scheduled.id))
        self.assertEqual(r.data["status"], "cancelled")
        self.assertEqual(r.data["message"], "Appointment cancelled successfully")
        self.appt_scheduled.refresh_from_db()
        self.assertEqual(self.appt_scheduled.status, "cancelled")
        self.assertEqual(self.appt_scheduled.updated_by_id, self.helpdesk_user.id)
        self.assertEqual(
            AppointmentHistory.objects.filter(appointment=self.appt_scheduled).count(),
            before_h + 1,
        )
        last = AppointmentHistory.objects.filter(appointment=self.appt_scheduled).first()
        self.assertEqual(last.status, "cancelled")
        self.assertEqual(last.comment, "Cancelled")

    def test_cancel_with_reason_in_history(self):
        r = self.client.patch(
            self._url(self.appt_scheduled),
            {"cancel_reason": "Patient requested"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        last = AppointmentHistory.objects.filter(appointment=self.appt_scheduled).first()
        self.assertEqual(last.comment, "Patient requested")

    def test_cancel_already_cancelled_idempotent(self):
        before_h = AppointmentHistory.objects.filter(appointment=self.appt_cancelled).count()
        r = self.client.patch(self._url(self.appt_cancelled), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["message"], "Appointment already cancelled")
        self.assertEqual(
            AppointmentHistory.objects.filter(appointment=self.appt_cancelled).count(),
            before_h,
        )

    def test_cancel_completed_invalid_status(self):
        r = self.client.patch(self._url(self.appt_completed), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["all"]["code"], "INVALID_STATUS")

    def test_cancel_no_show_invalid_status(self):
        r = self.client.patch(self._url(self.appt_no_show), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["all"]["code"], "INVALID_STATUS")

    def test_cancel_other_clinic_not_found(self):
        appt_other = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.other_clinic,
            appointment_date=self.future_day,
            slot_start_time=time(14, 0, 0),
            slot_end_time=time(14, 30, 0),
            status="scheduled",
        )
        r = self.client.patch(self._url(appt_other), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(r.data["all"]["code"], "NOT_FOUND")

    def test_patient_cancel_own_scheduled(self):
        self.client.force_authenticate(user=self.pat_user)
        r = self.client.patch(self._url(self.appt_scheduled), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_patient_cannot_cancel_other_appointment(self):
        other_user = User.objects.create_user(
            username=f"pat2_{uuid.uuid4().hex[:10]}",
            password="pass12345",
        )
        other_user.groups.add(Group.objects.get(name="patient"))
        other_account = PatientAccount.objects.create(user=other_user)
        other_account.clinics.add(self.clinic)
        other_profile = PatientProfile.objects.create(
            account=other_account,
            first_name="Other",
            last_name="Patient",
            relation="self",
            gender="female",
            age_years=25,
        )
        other_appt = Appointment.objects.create(
            patient_account=other_account,
            patient_profile=other_profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.future_day + timedelta(days=2),
            slot_start_time=time(15, 0, 0),
            slot_end_time=time(15, 30, 0),
            status="scheduled",
        )
        self.client.force_authenticate(user=self.pat_user)
        r = self.client.patch(self._url(other_appt), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(r.data["all"]["code"], "NOT_FOUND")

    def test_cancel_scheduled_with_encounter_invalid_state(self):
        ClinicalEncounter.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            appointment=self.appt_scheduled,
            encounter_type="appointment",
            status="created",
        )
        r = self.client.patch(self._url(self.appt_scheduled), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["all"]["code"], "INVALID_STATE")
