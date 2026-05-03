"""Unit tests for queue_service.add_to_queue and trigger_queue_realtime_update.

Run:
  python manage.py test queue_management.tests.test_queue_service_unit -v2
"""

from datetime import time
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from appointments.models import Appointment
from clinic.models import Clinic
from consultations_core.models.encounter import ClinicalEncounter
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile
from queue_management.models import Queue
from queue_management.services import queue_service as queue_service_mod
from queue_management.services.queue_service import (
    InvalidEncounterForQueueError,
    add_to_queue,
)

User = get_user_model()


def _uniq_reg():
    from uuid import uuid4

    return f"REG-{uuid4().hex[:12]}"


class AddToQueueTests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name="QSvc Clinic",
            registration_number=_uniq_reg(),
        )
        self.user = User.objects.create_user(username=f"u_{_uniq_reg()[:10]}", password="x")
        self.doc_user = User.objects.create_user(username=f"d_{_uniq_reg()[:10]}", password="x")
        self.doctor = DoctorModel.objects.create(
            user=self.doc_user,
            primary_specialization="general",
            is_approved=True,
        )
        self.doctor.clinics.add(self.clinic)
        pat_u = User.objects.create_user(username=f"p_{_uniq_reg()[:10]}", password="x")
        self.account = PatientAccount.objects.create(user=pat_u)
        self.account.clinics.add(self.clinic)
        self.profile = PatientProfile.objects.create(
            account=self.account,
            first_name="A",
            last_name="B",
            relation="self",
            gender="male",
            age_years=20,
        )
        self.today = timezone.localdate()

    def _encounter(self, **kwargs):
        return ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            status="created",
            **kwargs,
        )

    def test_add_to_queue_first_position_is_one(self):
        enc = self._encounter()
        with self.captureOnCommitCallbacks(execute=True):
            with transaction.atomic():
                q = add_to_queue(enc, self.user)
        self.assertEqual(q.position_in_queue, 1)
        self.assertEqual(q.status, "waiting")
        self.assertEqual(q.encounter_id, enc.id)

    def test_add_to_queue_increments_for_second_encounter(self):
        u2 = User.objects.create_user(username=f"p2_{_uniq_reg()[:10]}", password="x")
        ac2 = PatientAccount.objects.create(user=u2)
        ac2.clinics.add(self.clinic)
        pr2 = PatientProfile.objects.create(
            account=ac2,
            first_name="C",
            last_name="D",
            relation="self",
            gender="female",
            age_years=22,
        )
        enc1 = self._encounter()
        enc2 = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=ac2,
            patient_profile=pr2,
            doctor=self.doctor,
            status="created",
        )
        with self.captureOnCommitCallbacks(execute=True):
            with transaction.atomic():
                q1 = add_to_queue(enc1, self.user)
                q2 = add_to_queue(enc2, self.user)
        self.assertEqual(q1.position_in_queue, 1)
        self.assertEqual(q2.position_in_queue, 2)

    def test_add_to_queue_returns_existing_for_same_encounter(self):
        enc = self._encounter()
        with self.captureOnCommitCallbacks(execute=True):
            with transaction.atomic():
                q1 = add_to_queue(enc, self.user)
                q2 = add_to_queue(enc, self.user)
        self.assertEqual(q1.id, q2.id)

    def test_add_to_queue_returns_existing_when_appointment_queue_set(self):
        enc = self._encounter()
        appt = Appointment.objects.create(
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=self.today,
            slot_start_time=time(8, 0, 0),
            slot_end_time=time(8, 30, 0),
            status="checked_in",
        )
        enc.appointment = appt
        enc.save(update_fields=["appointment"])
        with self.captureOnCommitCallbacks(execute=True):
            with transaction.atomic():
                q1 = add_to_queue(enc, self.user)
        self.assertEqual(q1.appointment_id, appt.id)
        with self.captureOnCommitCallbacks(execute=True):
            with transaction.atomic():
                q2 = add_to_queue(enc, self.user)
        self.assertEqual(q1.id, q2.id)

    def test_add_to_queue_invalid_encounter_without_doctor(self):
        enc = ClinicalEncounter.objects.create(
            clinic=self.clinic,
            patient_account=self.account,
            patient_profile=self.profile,
            doctor=None,
            status="created",
        )
        with self.assertRaises(InvalidEncounterForQueueError):
            with transaction.atomic():
                add_to_queue(enc, self.user)

    def test_add_to_queue_retries_on_integrity_error(self):
        enc = self._encounter()
        real_create = Queue.objects.create
        calls = {"n": 0}

        def side_effect(*args, **kwargs):
            calls["n"] += 1
            if calls["n"] == 1:
                raise IntegrityError("dup position")
            return real_create(*args, **kwargs)

        with patch.object(Queue.objects, "create", side_effect=side_effect):
            with self.captureOnCommitCallbacks(execute=True):
                with transaction.atomic():
                    q = add_to_queue(enc, self.user)
        self.assertEqual(calls["n"], 2)
        self.assertIsNotNone(q.pk)


class TriggerQueueRealtimeTests(TestCase):
    def test_trigger_queue_realtime_update_calls_sync_after_commit(self):
        clinic = Clinic.objects.create(name="RT Clinic", registration_number=_uniq_reg())
        doc_user = User.objects.create_user(username=f"du_{_uniq_reg()[:10]}", password="x")
        doctor = DoctorModel.objects.create(
            user=doc_user, primary_specialization="general", is_approved=True
        )
        doctor.clinics.add(clinic)
        pat_u = User.objects.create_user(username=f"pu_{_uniq_reg()[:10]}", password="x")
        ac = PatientAccount.objects.create(user=pat_u)
        ac.clinics.add(clinic)
        pr = PatientProfile.objects.create(
            account=ac,
            first_name="E",
            last_name="F",
            relation="self",
            gender="male",
            age_years=25,
        )
        enc = ClinicalEncounter.objects.create(
            clinic=clinic,
            patient_account=ac,
            patient_profile=pr,
            doctor=doctor,
            status="created",
        )
        u = User.objects.create_user(username=f"usr_{_uniq_reg()[:10]}", password="x")

        with patch.object(queue_service_mod, "_sync_queue_realtime") as sync_mock:
            with self.captureOnCommitCallbacks(execute=True):
                with transaction.atomic():
                    add_to_queue(enc, u)
        sync_mock.assert_called()
        call_kw = sync_mock.call_args.kwargs
        self.assertEqual(call_kw["doctor_id"], doctor.id)
        self.assertEqual(call_kw["clinic_id"], clinic.id)
        self.assertEqual(call_kw["queue_date"], timezone.localdate())
