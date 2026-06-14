"""POST /api/appointments/doctor-appointments/ — doctor-scoped today's list."""

import uuid
from datetime import time

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
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _uniq_reg():
    return f"REG-{uuid.uuid4().hex[:12]}"


class DoctorAppointmentsAPITests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name=f"Doc Appt Clinic {uuid.uuid4().hex[:6]}",
            registration_number=_uniq_reg(),
        )

        g_doc, _ = Group.objects.get_or_create(name="doctor")
        self.doc_user = User.objects.create_user(
            username=f"doc_{uuid.uuid4().hex[:10]}",
            password="pass12345",
            first_name="Dhananjay",
            last_name="Lambe",
        )
        self.doc_user.groups.add(g_doc)
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
            first_name="Amit",
            last_name="Patil",
        )
        self.pat_user.groups.add(g_pat)
        self.account = PatientAccount.objects.create(user=self.pat_user)
        self.account.clinics.add(self.clinic)
        self.profile = PatientProfile.objects.create(
            account=self.account,
            first_name="Amit",
            last_name="Patil",
            relation="self",
            gender="male",
            age_years=35,
        )

        self.today = localdate()
        self.slot_start = time(9, 0)
        self.appt = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=self.slot_start,
            slot_end_time=time(9, 30),
            status="scheduled",
            appointment_type="follow_up",
        )

        self.client = APIClient()
        self.url = reverse("appointments:doctor-appointments")

    def test_doctor_appointments_today(self):
        self.client.force_authenticate(user=self.doc_user)
        response = self.client.post(
            self.url,
            {
                "doctor_id": str(self.doctor.id),
                "clinic_id": str(self.clinic.id),
                "date_filter": "today",
                "sort_by": "slot_start_time",
                "page_size": 50,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_appointments"], 1)
        row = response.data["appointments"][0]
        self.assertEqual(row["patient_name"], "Amit Patil")
        self.assertEqual(row["appointment_type"], "follow_up")
        self.assertEqual(row["status"], "scheduled")
        self.assertEqual(str(row["slot_start_time"])[:5], "09:00")
