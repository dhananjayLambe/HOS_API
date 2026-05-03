"""Idempotent / concurrent POST to pre-consultation/start/ (Test 19 style)."""

from __future__ import annotations

import threading
import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import connections
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinic.models import Clinic
from consultations_core.models.encounter import ClinicalEncounter, EncounterStatusLog
from consultations_core.services.encounter_service import EncounterService
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


class StartPreConsultationConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.clinic = Clinic.objects.create(
            name=f"Lock clinic {uuid.uuid4().hex[:8]}",
            registration_number=f"REG-{uuid.uuid4().hex[:12]}",
        )
        g, _ = Group.objects.get_or_create(name="doctor")
        self.user = User.objects.create_user(
            username=f"doc_lock_{uuid.uuid4().hex[:10]}",
            password="testpass123",
        )
        self.user.groups.add(g)

        pat = User.objects.create_user(
            username=f"pat_lock_{uuid.uuid4().hex[:10]}",
            password="testpass123",
        )
        account = PatientAccount.objects.create(user=pat)
        account.clinics.add(self.clinic)
        profile = PatientProfile.objects.create(
            account=account,
            first_name="P",
            last_name="Test",
            relation="self",
            gender="male",
            age_years=30,
        )
        self.encounter = EncounterService.create_encounter(
            clinic=self.clinic,
            patient_account=account,
            patient_profile=profile,
        )
        self.assertEqual(self.encounter.status, "created")

        self.url = reverse("pre-consultation-start", kwargs={"encounter_id": self.encounter.id})

    def test_sequential_double_post_single_status_log(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        r1 = client.post(self.url, format="json")
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r1.data.get("message"), "Pre-consultation started.")

        r2 = client.post(self.url, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(
            r2.data.get("message"),
            "Pre-consultation already in progress or completed.",
        )

        n_logs = EncounterStatusLog.objects.filter(
            encounter_id=self.encounter.id,
            from_status="created",
            to_status="pre_consultation_in_progress",
        ).count()
        self.assertEqual(n_logs, 1)

        self.encounter.refresh_from_db()
        self.assertEqual(self.encounter.status, "pre_consultation_in_progress")

    def test_concurrent_posts_single_status_log(self):
        barrier = threading.Barrier(2)
        codes: list[int] = []
        messages: list[str | None] = []

        def worker():
            connections.close_all()
            client = APIClient()
            client.force_authenticate(user=self.user)
            try:
                barrier.wait()
                r = client.post(self.url, format="json")
                codes.append(r.status_code)
                messages.append(r.data.get("message") if hasattr(r, "data") else None)
            finally:
                connections.close_all()

        t1 = threading.Thread(target=worker)
        t2 = threading.Thread(target=worker)
        t1.start()
        t2.start()
        t1.join(timeout=60)
        t2.join(timeout=60)
        self.assertFalse(t1.is_alive())
        self.assertFalse(t2.is_alive())

        self.assertEqual(sorted(codes), [status.HTTP_200_OK, status.HTTP_200_OK])
        self.assertEqual(set(messages), {"Pre-consultation started.", "Pre-consultation already in progress or completed."})

        n_logs = EncounterStatusLog.objects.filter(
            encounter_id=self.encounter.id,
            from_status="created",
            to_status="pre_consultation_in_progress",
        ).count()
        self.assertEqual(n_logs, 1)

        self.encounter.refresh_from_db()
        self.assertEqual(self.encounter.status, "pre_consultation_in_progress")
