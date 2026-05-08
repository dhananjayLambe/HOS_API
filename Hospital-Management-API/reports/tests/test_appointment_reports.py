import uuid
from datetime import date, datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from appointments.models import Appointment
from consultations_core.models.encounter import ClinicalEncounter
from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _uniq_reg():
    return f"REG-{uuid.uuid4().hex[:12]}"


class AppointmentSummaryReportAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("reports:appointment-summary-report")

        doctor_group, _ = Group.objects.get_or_create(name="doctor")

        self.user = User.objects.create_user(
            username=f"doc_{uuid.uuid4().hex[:8]}",
            password="pass12345",
            first_name="Dhananjay",
            last_name="Lambe",
        )
        self.user.groups.add(doctor_group)
        self.doctor = DoctorModel.objects.create(user=self.user, primary_specialization="general", is_approved=True)

        self.clinic = Clinic.objects.create(name="Insight Clinic", registration_number=_uniq_reg())
        self.doctor.clinics.add(self.clinic)

        self.patient_user = User.objects.create_user(
            username=f"pat_{uuid.uuid4().hex[:8]}",
            password="pass12345",
            first_name="Rahul",
            last_name="Patil",
        )
        self.account = PatientAccount.objects.create(user=self.patient_user)
        self.account.clinics.add(self.clinic)
        self.profile = PatientProfile.objects.create(
            account=self.account,
            first_name="Rahul",
            last_name="Patil",
            relation="self",
            gender="male",
            age_years=29,
        )

        self.today = date.today()
        # Current period appointments
        self._create_appointment(self.today - timedelta(days=1), time(10, 0), "completed", booking_source="walk_in")
        self._create_appointment(self.today - timedelta(days=1), time(11, 0), "completed", appointment_type="follow_up")
        self._create_appointment(self.today - timedelta(days=2), time(10, 0), "scheduled")
        self._create_appointment(self.today - timedelta(days=3), time(18, 0), "no_show")
        self._create_appointment(self.today - timedelta(days=3), time(12, 0), "cancelled")

        # Previous period appointment for delta checks
        self._create_appointment(self.today - timedelta(days=10), time(10, 0), "completed")

        self.client.force_authenticate(self.user)

    def _create_appointment(
        self,
        appointment_date,
        start_time,
        status,
        *,
        booking_source="online",
        appointment_type="new",
        patient_profile=None,
        patient_account=None,
    ):
        return Appointment.objects.create(
            patient_account=patient_account or self.account,
            patient_profile=patient_profile or self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=appointment_date,
            slot_start_time=start_time,
            slot_end_time=(datetime_combine_stub(start_time) + timedelta(minutes=30)).time(),
            status=status,
            booking_source=booking_source,
            appointment_type=appointment_type,
        )

    def test_summary_endpoint_returns_complete_schema(self):
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_keys = {
            "summary",
            "operational_summary",
            "performance_insights",
            "status_distribution",
            "appointment_type_distribution",
            "daily_trends",
            "monthly_trends",
            "peak_hours",
            "patient_split",
            "doctor_load",
            "recent_appointments",
        }
        self.assertEqual(set(response.data.keys()), expected_keys)
        self.assertIn("total_appointments", response.data["summary"])
        self.assertEqual(len(response.data["recent_appointments"]), 5)

    def test_status_filter_no_show(self):
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
                "status": "no_show",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["total_appointments"]["count"], 1)
        self.assertEqual(response.data["summary"]["no_show"]["count"], 1)

    def test_standalone_encounter_completion_counts_without_appointment_row(self):
        """Direct OPD consultations often persist only as ClinicalEncounter with appointment=NULL."""
        closed_at = timezone.make_aware(datetime.combine(self.today - timedelta(days=1), time(13, 0)))
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
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["summary"]["completed"]["count"], 3)
        load = response.data["doctor_load"]
        self.assertEqual(len(load), 1)
        self.assertGreaterEqual(load[0]["completed"], 3)

    def test_encounter_consultation_completed_counts_when_appointment_still_checked_in(self):
        """Completed consultations often live on ClinicalEncounter; appointment row may lag as checked_in."""
        appt = self._create_appointment(self.today - timedelta(days=1), time(9, 0), "checked_in")
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            appointment=appt,
            status="consultation_completed",
        )
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # setUp has 2 completed appointments in-window; +1 from encounter-driven completion
        self.assertGreaterEqual(response.data["summary"]["completed"]["count"], 3)
        load = response.data["doctor_load"]
        self.assertEqual(len(load), 1)
        self.assertGreaterEqual(load[0]["completed"], 3)

    def test_encounter_no_show_counts_when_appointment_status_not_synced(self):
        """No-show recorded on ClinicalEncounter must surface when Appointment.status was never updated."""
        appt = self._create_appointment(self.today - timedelta(days=1), time(8, 0), "checked_in")
        ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            appointment=appt,
            status="no_show",
        )
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # setUp includes one appointment with status no_show; plus encounter-driven no_show above
        self.assertGreaterEqual(response.data["summary"]["no_show"]["count"], 2)
        load = response.data["doctor_load"]
        self.assertEqual(len(load), 1)
        self.assertGreaterEqual(load[0]["no_show"], 2)

    def test_walk_in_follow_up_counts_in_follow_up_distribution(self):
        """Follow-up visits booked as walk-in must appear under follow_up (not disappear from charts)."""
        self._create_appointment(
            self.today - timedelta(days=1),
            time(15, 30),
            "completed",
            booking_source="walk_in",
            appointment_type="follow_up",
        )
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_type = {row["type"]: row["count"] for row in response.data["appointment_type_distribution"]}
        self.assertGreaterEqual(by_type.get("follow_up", 0), 2)

    def test_in_consultation_increments_completed_summary(self):
        """in_consultation is rolled into completed for OPD KPIs."""
        self._create_appointment(self.today - timedelta(days=1), time(16, 0), "in_consultation")
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # setUp has 2 completed in-window; +1 in_consultation merged into completed → ≥ 3
        self.assertGreaterEqual(response.data["summary"]["completed"]["count"], 3)

    def test_doctor_load_ignores_status_filter_for_breakdown_counts(self):
        """Doctor Performance rows must aggregate completed/no_show across all statuses for the period."""
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
                "status": "no_show",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        load = response.data["doctor_load"]
        self.assertEqual(len(load), 1)
        row = load[0]
        self.assertGreater(row["total"], 1)
        self.assertGreater(row["completed"], 0)
        self.assertGreater(row["no_show"], 0)

    def test_status_filter_booked_maps_to_scheduled(self):
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
                "status": "booked",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["total_appointments"]["count"], 1)
        self.assertEqual(response.data["summary"]["checked_in"]["count"], 0)

    def test_invalid_doctor_id_returns_400(self):
        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
                "doctor_id": str(uuid.uuid4()),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patient_split_counts_new_and_returning(self):
        new_user = User.objects.create_user(
            username=f"newpat_{uuid.uuid4().hex[:8]}",
            password="pass12345",
            first_name="Sneha",
            last_name="Joshi",
        )
        new_account = PatientAccount.objects.create(user=new_user)
        new_account.clinics.add(self.clinic)
        new_profile = PatientProfile.objects.create(
            account=new_account,
            first_name="Sneha",
            last_name="Joshi",
            relation="self",
            gender="female",
            age_years=24,
        )
        self._create_appointment(self.today - timedelta(days=1), time(14, 0), "completed", patient_account=new_account, patient_profile=new_profile)

        response = self.client.get(
            self.url,
            {
                "start_date": (self.today - timedelta(days=6)).isoformat(),
                "end_date": self.today.isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["patient_split"]["new_patients"], 1)
        self.assertEqual(response.data["patient_split"]["returning_patients"], 1)

    def test_invalid_date_range_returns_400(self):
        response = self.client.get(
            self.url,
            {
                "start_date": self.today.isoformat(),
                "end_date": (self.today - timedelta(days=1)).isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_range_returns_zeroed_schema(self):
        response = self.client.get(
            self.url,
            {
                "start_date": "2001-01-01",
                "end_date": "2001-01-07",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["total_appointments"]["count"], 0)
        self.assertEqual(response.data["status_distribution"][0]["count"], 0)
        self.assertEqual(response.data["doctor_load"], [])
        self.assertEqual(response.data["recent_appointments"], [])

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_forbidden_for_patient_role(self):
        patient_group, _ = Group.objects.get_or_create(name="patient")
        patient_user = User.objects.create_user(
            username=f"rolepat_{uuid.uuid4().hex[:8]}",
            password="pass12345",
            first_name="Role",
            last_name="Patient",
        )
        patient_user.groups.add(patient_group)
        self.client.force_authenticate(user=patient_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


def datetime_combine_stub(t: time):
    from datetime import datetime

    return datetime.combine(date.today(), t)
