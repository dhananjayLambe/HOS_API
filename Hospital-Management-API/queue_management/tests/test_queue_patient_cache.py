"""Tests for QueuePatientView Redis cache JSON serialization (C5).

Run:
  python manage.py test queue_management.tests.test_queue_patient_cache -v2
"""

import json
from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinic.models import Clinic
from doctor.models import doctor as DoctorModel
from patient_account.models import PatientAccount, PatientProfile
from queue_management.models import Queue

User = get_user_model()


def _uniq_reg():
    return f"REG-{uuid4().hex[:12]}"


class QueuePatientCacheTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.clinic = Clinic.objects.create(
            name="Cache Clinic",
            registration_number=_uniq_reg(),
        )
        self.user = User.objects.create_user(
            username=f"u_{_uniq_reg()[:10]}",
            password="x",
        )
        self.doc_user = User.objects.create_user(
            username=f"d_{_uniq_reg()[:10]}",
            password="x",
            first_name="Doc",
            last_name="Tor",
        )
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
        self.queue = Queue.objects.create(
            doctor=self.doctor,
            clinic=self.clinic,
            patient_account=self.account,
            patient=self.profile,
            status="waiting",
            position_in_queue=1,
            estimated_wait_time=timedelta(minutes=15),
        )
        self.url = reverse("queue-patient-status", kwargs={"id": self.profile.id})
        self.query = {
            "doctor_id": str(self.doctor.id),
            "clinic_id": str(self.clinic.id),
        }
        self.redis_key = (
            f"queue:patient:{self.profile.id}:"
            f"doctor:{self.doctor.id}:clinic:{self.clinic.id}"
        )
        self.client.force_authenticate(user=self.user)

    def _cached_payload(self):
        return {
            "id": str(self.queue.id),
            "status": "waiting",
            "queue_position": 1,
            "estimated_wait_time": "00:15:00",
            "doctor_name": "Doc Tor",
            "clinic_name": "Cache Clinic",
            "check_in_time": "2026-07-20T10:00:00Z",
        }

    @patch("queue_management.api.views.redis_client")
    def test_json_cache_hit_skips_db_write(self, mock_redis):
        payload = self._cached_payload()
        mock_redis.get.return_value = json.dumps(payload)

        with patch("queue_management.api.views.get_object_or_404") as mock_get:
            response = self.client.get(self.url, self.query)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "waiting")
        self.assertEqual(response.data["queue_position"], 1)
        mock_get.assert_not_called()
        mock_redis.setex.assert_not_called()
        mock_redis.delete.assert_not_called()
        mock_redis.get.assert_called_once_with(self.redis_key)

    @patch("queue_management.api.views.redis_client")
    def test_cache_miss_reads_db_and_stores_json(self, mock_redis):
        mock_redis.get.return_value = None

        response = self.client.get(self.url, self.query)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "waiting")
        self.assertEqual(response.data["queue_position"], 1)
        mock_redis.setex.assert_called_once()
        args = mock_redis.setex.call_args[0]
        self.assertEqual(args[0], self.redis_key)
        self.assertEqual(args[1], 10)
        stored = json.loads(args[2])
        self.assertIsInstance(stored, dict)
        self.assertEqual(stored["status"], "waiting")
        mock_redis.delete.assert_not_called()

    @patch("queue_management.api.views.redis_client")
    def test_legacy_str_dict_cache_is_treated_as_miss(self, mock_redis):
        mock_redis.get.return_value = str({"status": "waiting", "queue_position": 99})

        response = self.client.get(self.url, self.query)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["queue_position"], 1)
        mock_redis.delete.assert_called_once_with(self.redis_key)
        mock_redis.setex.assert_called_once()
        stored = json.loads(mock_redis.setex.call_args[0][2])
        self.assertIsInstance(stored, dict)
        self.assertEqual(stored["queue_position"], 1)

    @patch("queue_management.api.views.redis_client")
    def test_malicious_python_expression_is_not_evaluated(self, mock_redis):
        mock_redis.get.return_value = "__import__('os').system('id')"

        with patch("builtins.eval") as mock_eval:
            response = self.client.get(self.url, self.query)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_eval.assert_not_called()
        mock_redis.delete.assert_called_once_with(self.redis_key)
        mock_redis.setex.assert_called_once()

    @patch("queue_management.api.views.redis_client")
    def test_non_object_json_is_treated_as_miss(self, mock_redis):
        for invalid in ("[]", '"x"', "null"):
            mock_redis.reset_mock()
            mock_redis.get.return_value = invalid

            response = self.client.get(self.url, self.query)

            self.assertEqual(response.status_code, status.HTTP_200_OK, invalid)
            self.assertEqual(response.data["status"], "waiting", invalid)
            mock_redis.delete.assert_called_once_with(self.redis_key)
            mock_redis.setex.assert_called_once()
            stored = json.loads(mock_redis.setex.call_args[0][2])
            self.assertIsInstance(stored, dict)
