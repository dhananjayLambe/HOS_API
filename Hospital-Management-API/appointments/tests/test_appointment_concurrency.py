"""Concurrency: double check-in and many parallel check-ins (TransactionTestCase).

Run all (includes slow):
  python manage.py test appointments.tests.test_appointment_concurrency -v2

Fast only:
  python manage.py test appointments.tests.test_appointment_concurrency.CheckInConcurrencyTests -v2
"""

import threading
from datetime import time
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import connections
from django.test import TransactionTestCase, tag
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from appointments.models import Appointment
from clinic.models import Clinic
from consultations_core.models.encounter import ClinicalEncounter
from doctor.models import doctor as DoctorModel
from helpdesk.models import HelpdeskClinicUser
from patient_account.models import PatientAccount, PatientProfile
from queue_management.models import Queue

User = get_user_model()


def _uniq_reg():
    from uuid import uuid4

    return f"REG-{uuid4().hex[:12]}"


class CheckInConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name=f"Conc Clinic {_uniq_reg()[:6]}",
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
        )
        self.doctor = DoctorModel.objects.create(
            user=self.doc_user,
            primary_specialization="general",
            is_approved=True,
        )
        self.doctor.clinics.add(self.clinic)

    def _patient_bundle(self, idx: int):
        g_pat, _ = Group.objects.get_or_create(name="patient")
        u = User.objects.create_user(
            username=f"p{idx}_{_uniq_reg()[:8]}",
            password="pass12345",
        )
        u.groups.add(g_pat)
        ac = PatientAccount.objects.create(user=u)
        ac.clinics.add(self.clinic)
        pr = PatientProfile.objects.create(
            account=ac,
            first_name="P",
            last_name=str(idx),
            relation="self",
            gender="male",
            age_years=20 + idx,
        )
        return ac, pr

    @patch("queue_management.services.queue_service._sync_queue_realtime")
    def test_concurrent_double_check_in_one_encounter_one_queue(self, _mock_sync):
        ac, pr = self._patient_bundle(0)
        today = timezone.localdate()
        appt = Appointment.objects.create(
            patient_account=ac,
            patient_profile=pr,
            doctor=self.doctor,
            clinic=self.clinic,
            appointment_date=today,
            slot_start_time=time(9, 0, 0),
            slot_end_time=time(9, 30, 0),
            status="scheduled",
        )
        url = reverse("appointments:appointment-check-in", kwargs={"pk": appt.id})
        codes = []

        def worker():
            connections.close_all()
            c = APIClient()
            c.force_authenticate(user=self.helpdesk_user)
            codes.append(c.post(url, {}, format="json").status_code)

        t1 = threading.Thread(target=worker)
        t2 = threading.Thread(target=worker)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertTrue(all(s == status.HTTP_200_OK for s in codes), codes)
        self.assertEqual(ClinicalEncounter.objects.filter(appointment=appt).count(), 1)
        self.assertEqual(Queue.objects.filter(appointment_id=appt.id).count(), 1)

    @tag("slow")
    @patch("queue_management.services.queue_service._sync_queue_realtime")
    def test_many_parallel_check_ins_unique_positions(self, _mock_sync):
        today = timezone.localdate()
        appointments = []
        for i in range(25):
            ac, pr = self._patient_bundle(i + 1)
            appt = Appointment.objects.create(
                patient_account=ac,
                patient_profile=pr,
                doctor=self.doctor,
                clinic=self.clinic,
                appointment_date=today,
                slot_start_time=time(10, i, 0),
                slot_end_time=time(10, i, 30),
                status="scheduled",
            )
            appointments.append(appt)

        codes = []
        lock = threading.Lock()

        def worker(appt_id):
            connections.close_all()
            c = APIClient()
            c.force_authenticate(user=self.helpdesk_user)
            r = c.post(
                reverse("appointments:appointment-check-in", kwargs={"pk": appt_id}),
                {},
                format="json",
            )
            with lock:
                codes.append(r.status_code)

        threads = [
            threading.Thread(target=worker, args=(a.id,))
            for a in appointments
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len([c for c in codes if c == status.HTTP_200_OK]), 25, codes)
        qs = Queue.objects.filter(
            doctor=self.doctor,
            clinic=self.clinic,
            created_at__date=today,
        )
        self.assertEqual(qs.count(), 25)
        positions = list(qs.values_list("position_in_queue", flat=True))
        self.assertEqual(len(positions), len(set(positions)), "duplicate queue positions")
        self.assertEqual(set(positions), set(range(1, 26)))
        self.assertEqual(
            ClinicalEncounter.objects.filter(appointment__in=appointments).count(),
            25,
        )
