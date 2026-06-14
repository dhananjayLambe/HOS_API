"""GET /api/appointments/metrics/today/ — encounter-aware schedule KPIs."""

import uuid
from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.utils.timezone import localdate
from rest_framework import status
from rest_framework.test import APIClient

from appointments.models import Appointment
from clinic.models import Clinic
from consultations_core.models.encounter import ClinicalEncounter
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _uniq_reg():
    return f"REG-{uuid.uuid4().hex[:12]}"


class AppointmentTodayMetricsAPITests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name=f"Metrics Clinic {uuid.uuid4().hex[:6]}",
            registration_number=_uniq_reg(),
        )

        g_doc, _ = Group.objects.get_or_create(name="doctor")
        self.doc_user = User.objects.create_user(
            username=f"doc_{uuid.uuid4().hex[:10]}",
            password="pass12345",
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
        self.client = APIClient()
        self.url = reverse("appointments:appointment-metrics-today")

    def _metrics(self):
        self.client.force_authenticate(user=self.doc_user)
        return self.client.get(
            self.url,
            {"doctor_id": str(self.doctor.id), "clinic_id": str(self.clinic.id)},
        )

    def test_counts_completed_appointment_row(self):
        Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(9, 0),
            slot_end_time=time(9, 30),
            status="completed",
        )
        response = self._metrics()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["completed"], 1)

    def test_counts_standalone_walk_in_encounter_completed_today(self):
        """Walk-in consultations without an Appointment row must count as completed."""
        closed_at = timezone.make_aware(
            timezone.datetime.combine(self.today, time(11, 0)),
            timezone.get_current_timezone(),
        )
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            appointment=None,
            encounter_type="walk_in",
            status="consultation_completed",
            closed_at=closed_at,
            is_active=False,
        )
        response = self._metrics()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["completed"], 1)

    def test_counts_encounter_completed_when_appointment_still_checked_in(self):
        appt = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(10, 0),
            slot_end_time=time(10, 30),
            status="checked_in",
        )
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            appointment=appt,
            status="consultation_completed",
        )
        response = self._metrics()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["completed"], 1)
        self.assertEqual(response.data["data"]["waiting"], 0)

    def test_counts_standalone_cancelled_encounter_today(self):
        closed_at = timezone.make_aware(
            timezone.datetime.combine(self.today, time(11, 30)),
            timezone.get_current_timezone(),
        )
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            appointment=None,
            encounter_type="walk_in",
            status="cancelled",
            updated_at=closed_at,
            is_active=False,
        )
        response = self._metrics()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["cancelled"], 1)

    def test_counts_encounter_no_show_when_appointment_still_checked_in(self):
        appt = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(8, 0),
            slot_end_time=time(8, 30),
            status="checked_in",
        )
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            appointment=appt,
            status="no_show",
        )
        response = self._metrics()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["no_show"], 1)
        self.assertEqual(response.data["data"]["waiting"], 0)

    def test_does_not_count_encounter_completed_on_other_days(self):
        yesterday = self.today - timedelta(days=1)
        closed_at = timezone.make_aware(
            timezone.datetime.combine(yesterday, time(11, 0)),
            timezone.get_current_timezone(),
        )
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            appointment=None,
            encounter_type="walk_in",
            status="consultation_completed",
            closed_at=closed_at,
            is_active=False,
        )
        response = self._metrics()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["completed"], 0)
