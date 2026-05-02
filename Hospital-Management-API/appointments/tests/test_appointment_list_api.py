"""GET /api/appointments/ list filters (tab, doctor, empty results)."""

import uuid
from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from django.utils.timezone import localdate
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


class AppointmentListAPITests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name=f"List Clinic {uuid.uuid4().hex[:6]}",
            registration_number=_uniq_reg(),
        )
        self.other_clinic = Clinic.objects.create(
            name=f"Other {uuid.uuid4().hex[:6]}",
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

        self.today = localdate()
        self.tomorrow = self.today + timedelta(days=1)
        self.yesterday = self.today - timedelta(days=1)

        self.slot_a = time(10, 0)
        self.slot_b = time(11, 0)

        self.appt_today = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=self.slot_a,
            slot_end_time=time(10, 30),
            status="scheduled",
        )
        self.appt_today_cancelled = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=self.slot_b,
            slot_end_time=time(11, 30),
            status="cancelled",
        )
        self.appt_future = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor2,
            clinic=self.clinic,
            appointment_date=self.tomorrow,
            slot_start_time=self.slot_a,
            slot_end_time=time(10, 30),
            status="scheduled",
        )
        self.appt_completed = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.yesterday,
            slot_start_time=self.slot_a,
            slot_end_time=time(10, 30),
            status="completed",
        )
        self.appt_no_show = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.yesterday,
            slot_start_time=self.slot_b,
            slot_end_time=time(11, 30),
            status="no_show",
        )

        doc3_user = User.objects.create_user(
            username=f"doc3_{uuid.uuid4().hex[:10]}",
            password="pass12345",
            first_name="Other",
            last_name="ClinicDoc",
        )
        self.doctor3 = DoctorModel.objects.create(
            user=doc3_user,
            primary_specialization="general",
            is_approved=True,
        )
        self.doctor3.clinics.add(self.other_clinic)
        # Different patient so pat_user's "today" list does not include this row.
        other_clinic_pat_user = User.objects.create_user(
            username=f"ocp_{uuid.uuid4().hex[:10]}",
            password="pass12345",
            first_name="Other",
            last_name="Patient",
        )
        other_clinic_acct = PatientAccount.objects.create(user=other_clinic_pat_user)
        other_clinic_acct.clinics.add(self.other_clinic)
        other_clinic_prof = PatientProfile.objects.create(
            account=other_clinic_acct,
            first_name="Other",
            last_name="Patient",
            relation="self",
            gender="male",
            age_years=40,
        )
        self.appt_other_clinic = Appointment.objects.create(
            patient_account=other_clinic_acct,
            patient_profile=other_clinic_prof,
            doctor=self.doctor3,
            clinic=self.other_clinic,
            appointment_date=self.today,
            slot_start_time=time(9, 0),
            slot_end_time=time(9, 30),
            status="scheduled",
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.helpdesk_user)
        self.url = reverse("appointments:appointment-create")

    def test_invalid_tab_returns_400(self):
        r = self.client.get(self.url, {"tab": "unknown"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tab", r.data)

    def test_today_tab_excludes_cancelled(self):
        r = self.client.get(self.url, {"tab": "today"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in r.data}
        self.assertIn(str(self.appt_today.id), ids)
        self.assertNotIn(str(self.appt_today_cancelled.id), ids)
        self.assertNotIn(
            str(self.appt_other_clinic.id),
            ids,
            "Helpdesk must not see appointments outside assigned clinic.",
        )

    def test_default_tab_is_today(self):
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in r.data}
        self.assertIn(str(self.appt_today.id), ids)
        self.assertNotIn(str(self.appt_today_cancelled.id), ids)

    def test_upcoming_only_future_non_cancelled(self):
        r = self.client.get(self.url, {"tab": "upcoming"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in r.data}
        self.assertIn(str(self.appt_future.id), ids)
        self.assertNotIn(str(self.appt_today.id), ids)

    def test_completed_only_completed_status(self):
        r = self.client.get(self.url, {"tab": "completed"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in r.data}
        self.assertIn(str(self.appt_completed.id), ids)
        self.assertNotIn(str(self.appt_no_show.id), ids)

    def test_cancelled_includes_no_show(self):
        r = self.client.get(self.url, {"tab": "cancelled"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in r.data}
        self.assertIn(str(self.appt_today_cancelled.id), ids)
        self.assertIn(str(self.appt_no_show.id), ids)

    def test_filter_by_doctor(self):
        r = self.client.get(
            self.url,
            {"tab": "upcoming", "doctor_id": str(self.doctor2.id)},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in r.data}
        self.assertEqual(ids, {str(self.appt_future.id)})

    def test_filter_doctor_empty_subset(self):
        r = self.client.get(
            self.url,
            {"tab": "today", "doctor_id": str(self.doctor2.id)},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data, [])

    def test_patient_sees_only_own(self):
        other_user = User.objects.create_user(
            username=f"other_{uuid.uuid4().hex[:8]}",
            password="pass12345",
        )
        g_p, _ = Group.objects.get_or_create(name="patient")
        other_user.groups.add(g_p)
        other_acct = PatientAccount.objects.create(user=other_user)
        other_acct.clinics.add(self.clinic)
        other_prof = PatientProfile.objects.create(
            account=other_acct,
            first_name="X",
            last_name="Y",
            relation="self",
            gender="male",
            age_years=20,
        )
        Appointment.objects.create(
            patient_account=other_acct,
            patient_profile=other_prof,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(14, 0),
            slot_end_time=time(14, 30),
            status="scheduled",
        )

        self.client.force_authenticate(user=self.pat_user)
        r = self.client.get(self.url, {"tab": "today"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in r.data}
        self.assertEqual(ids, {str(self.appt_today.id)})

    def test_list_row_shape(self):
        r = self.client.get(self.url, {"tab": "today"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        row = next(x for x in r.data if x["id"] == str(self.appt_today.id))
        self.assertEqual(row["patient_name"], "Pat Client")
        self.assertEqual(row["doctor_name"], "Ann Smith")
        self.assertEqual(row["status"], "scheduled")
        self.assertEqual(str(row["patient_account_id"]), str(self.account.id))
