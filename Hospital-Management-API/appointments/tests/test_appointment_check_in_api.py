"""POST /api/appointments/<id>/check-in/ — encounter, idempotency, validation, scoping."""

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
from queue_management.models import Queue

User = get_user_model()


def _uniq_reg():
    return f"REG-{uuid.uuid4().hex[:12]}"


class AppointmentCheckInAPITests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name=f"CheckIn Clinic {uuid.uuid4().hex[:6]}",
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
        self.tomorrow = self.today + timedelta(days=1)
        self.yesterday = self.today - timedelta(days=1)

        # Separate same-day slots so tests do not fight the unique_active_doctor_slot constraint.
        self.appt_today_success = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(10, 0, 0),
            slot_end_time=time(10, 30, 0),
            status="scheduled",
        )
        self.appt_today_idempotent = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(10, 35, 0),
            slot_end_time=time(11, 5, 0),
            status="scheduled",
        )
        self.appt_today_dup = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(11, 10, 0),
            slot_end_time=time(11, 40, 0),
            status="scheduled",
        )

        self.appt_future_scheduled = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.tomorrow,
            slot_start_time=time(11, 0, 0),
            slot_end_time=time(11, 30, 0),
            status="scheduled",
        )

        self.appt_past_scheduled = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.yesterday,
            slot_start_time=time(9, 0, 0),
            slot_end_time=time(9, 30, 0),
            status="scheduled",
        )

        self.appt_completed = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.yesterday,
            slot_start_time=time(8, 0, 0),
            slot_end_time=time(8, 30, 0),
            status="completed",
        )

        self.appt_cancelled = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(14, 0, 0),
            slot_end_time=time(14, 30, 0),
            status="cancelled",
        )

        self.appt_no_show = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.yesterday,
            slot_start_time=time(7, 0, 0),
            slot_end_time=time(7, 30, 0),
            status="no_show",
        )

        self.superuser = User.objects.create_superuser(
            username=f"su_{uuid.uuid4().hex[:10]}",
            password="pass12345",
            email="su@example.com",
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.helpdesk_user)

    def _url(self, appt):
        return reverse("appointments:appointment-check-in", kwargs={"pk": appt.id})

    def test_check_in_scheduled_success(self):
        appt = self.appt_today_success
        before_h = AppointmentHistory.objects.filter(appointment=appt).count()
        r = self.client.post(self._url(appt), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["id"], str(appt.id))
        self.assertEqual(r.data["status"], "checked_in")
        self.assertIn("encounter_id", r.data)
        self.assertIsNotNone(r.data["encounter_id"])
        self.assertIsNotNone(r.data.get("check_in_time"))
        self.assertEqual(r.data["message"], "Patient checked in successfully")
        self.assertIn("queue_position", r.data)
        self.assertEqual(r.data["queue_position"], 1)
        self.assertTrue(Queue.objects.filter(appointment_id=appt.id).exists())

        appt.refresh_from_db()
        self.assertEqual(appt.status, "checked_in")
        self.assertIsNotNone(appt.check_in_time)
        self.assertEqual(appt.updated_by_id, self.helpdesk_user.id)

        self.assertEqual(
            AppointmentHistory.objects.filter(appointment=appt).count(),
            before_h + 1,
        )
        last = AppointmentHistory.objects.filter(appointment=appt).first()
        self.assertEqual(last.status, "checked_in")
        self.assertEqual(last.comment, "Patient checked in")

        enc = ClinicalEncounter.objects.get(id=r.data["encounter_id"])
        self.assertEqual(enc.encounter_type, "appointment")
        self.assertEqual(enc.appointment_id, appt.id)
        self.assertEqual(enc.status, "created")

    def test_check_in_already_checked_in_idempotent(self):
        appt = self.appt_today_idempotent
        r1 = self.client.post(self._url(appt), {}, format="json")
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        eid = r1.data["encounter_id"]
        t1 = r1.data["check_in_time"]
        before_h = AppointmentHistory.objects.filter(appointment=appt).count()

        r2 = self.client.post(self._url(appt), {}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["encounter_id"], eid)
        self.assertEqual(r2.data["check_in_time"], t1)
        self.assertEqual(r2.data["message"], "Appointment already checked in")
        self.assertEqual(r1.data["queue_position"], r2.data["queue_position"])

        self.assertEqual(
            AppointmentHistory.objects.filter(appointment=appt).count(),
            before_h,
        )
        self.assertEqual(
            ClinicalEncounter.objects.filter(appointment=appt).count(),
            1,
        )
        self.assertEqual(Queue.objects.filter(appointment_id=appt.id).count(), 1)

    def test_check_in_idempotent_missing_encounter_conflict(self):
        orphan = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(16, 0, 0),
            slot_end_time=time(16, 30, 0),
            status="checked_in",
            check_in_time=timezone.now(),
        )
        r = self.client.post(self._url(orphan), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(r.data["all"]["code"], "CONFLICT")
        self.assertEqual(r.data["all"]["message"], "Encounter missing for checked-in appointment")

    def test_check_in_future_date_invalid(self):
        r = self.client.post(self._url(self.appt_future_scheduled), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["all"]["code"], "INVALID_DATE")

    def test_check_in_past_date_allowed(self):
        r = self.client.post(self._url(self.appt_past_scheduled), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["message"], "Patient checked in successfully")
        self.assertIn("queue_position", r.data)

    def test_check_in_completed_invalid_status(self):
        r = self.client.post(self._url(self.appt_completed), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["all"]["code"], "INVALID_STATUS")

    def test_check_in_cancelled_invalid_status(self):
        r = self.client.post(self._url(self.appt_cancelled), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["all"]["code"], "INVALID_STATUS")

    def test_check_in_no_show_invalid_status(self):
        r = self.client.post(self._url(self.appt_no_show), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["all"]["code"], "INVALID_STATUS")

    def test_check_in_other_clinic_not_found(self):
        self.doctor.clinics.add(self.other_clinic)
        appt_other = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.other_clinic,
            appointment_date=self.today,
            slot_start_time=time(15, 0, 0),
            slot_end_time=time(15, 30, 0),
            status="scheduled",
        )
        r = self.client.post(self._url(appt_other), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(r.data["all"]["code"], "NOT_FOUND")

    def test_check_in_patient_forbidden(self):
        self.client.force_authenticate(user=self.pat_user)
        r = self.client.post(self._url(self.appt_future_scheduled), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_check_in_superuser_any_clinic(self):
        appt_other = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.other_clinic,
            appointment_date=self.today,
            slot_start_time=time(13, 0, 0),
            slot_end_time=time(13, 30, 0),
            status="scheduled",
        )
        self.client.force_authenticate(user=self.superuser)
        r = self.client.post(self._url(appt_other), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["message"], "Patient checked in successfully")
        self.assertIn("queue_position", r.data)

    def test_queue_position_increments_for_second_appointment_same_day(self):
        """Two different patients → two encounters → queue positions 1 and 2."""
        pat2 = User.objects.create_user(
            username=f"pat2_{uuid.uuid4().hex[:10]}",
            password="pass12345",
            first_name="Pat",
            last_name="Two",
        )
        g_pat, _ = Group.objects.get_or_create(name="patient")
        pat2.groups.add(g_pat)
        acct2 = PatientAccount.objects.create(user=pat2)
        acct2.clinics.add(self.clinic)
        prof2 = PatientProfile.objects.create(
            account=acct2,
            first_name="Pat",
            last_name="Two",
            relation="self",
            gender="female",
            age_years=25,
        )
        appt_b = Appointment.objects.create(
            patient_account=acct2,
            patient_profile=prof2,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(17, 0, 0),
            slot_end_time=time(17, 30, 0),
            status="scheduled",
        )

        r1 = self.client.post(self._url(self.appt_today_success), {}, format="json")
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r1.data["queue_position"], 1)
        r2 = self.client.post(self._url(appt_b), {}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["queue_position"], 2)
        self.assertEqual(
            Queue.objects.filter(
                doctor=self.doctor,
                clinic=self.clinic,
                created_at__date=self.today,
            ).count(),
            2,
        )

    def test_check_in_no_duplicate_encounter_on_repeat(self):
        appt = self.appt_today_dup
        r1 = self.client.post(self._url(appt), {}, format="json")
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        r2 = self.client.post(self._url(appt), {}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(
            ClinicalEncounter.objects.filter(appointment=appt).count(),
            1,
        )

    def test_check_in_does_not_overwrite_existing_encounter_link(self):
        other_appt = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(12, 0, 0),
            slot_end_time=time(12, 30, 0),
            status="scheduled",
        )
        target = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(12, 45, 0),
            slot_end_time=time(13, 15, 0),
            status="scheduled",
        )
        enc = ClinicalEncounter.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            appointment=other_appt,
            encounter_type="appointment",
            status="created",
        )
        r = self.client.post(self._url(target), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["encounter_id"], str(enc.id))
        enc.refresh_from_db()
        self.assertEqual(enc.appointment_id, other_appt.id)
