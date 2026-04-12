"""
API tests for GET /api/consultations/instructions/suggestions/
"""
import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from consultations_core.tests.fixtures_instruction_suggestions import FakeInstructionMetadata

User = get_user_model()

SUGGESTIONS_URL = "instruction-suggestions"


def _make_doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    u = User.objects.create_user(
        username=f"doc_sug_{uuid.uuid4().hex[:12]}",
        password="testpass123",
        first_name="Doc",
        last_name="Test",
    )
    u.groups.add(g)
    client = APIClient()
    client.force_authenticate(user=u)
    return client, u


def _make_authenticated_non_doctor_client():
    u = User.objects.create_user(
        username=f"staff_sug_{uuid.uuid4().hex[:12]}",
        password="testpass123",
        first_name="Staff",
        last_name="NoDoctor",
    )
    client = APIClient()
    client.force_authenticate(user=u)
    return client, u


@patch(
    "consultations_core.services.instruction_suggestion_service.MetadataLoader.get",
    side_effect=FakeInstructionMetadata.loader_get,
)
class InstructionSuggestionsAPITests(TestCase):
    """HTTP contract, auth, query parsing, and error paths."""

    def test_get_success_envelope(self, _mock):
        client, _ = _make_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(r.data.get("success"))
        self.assertIn("data", r.data)
        self.assertIn("meta", r.data)
        self.assertIn("total", r.data["meta"])
        self.assertIn("filtered", r.data["meta"])
        self.assertIsInstance(r.data["data"], list)

    def test_get_with_specialty_and_search(self, _mock):
        client, _ = _make_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url, {"specialty": "cardiologist", "q": "pressure"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(r.data["success"])
        self.assertEqual(r.data["meta"]["total"], 1)
        self.assertEqual(len(r.data["data"]), 1)
        self.assertEqual(r.data["data"][0]["key"], "monitor_blood_pressure")
        self.assertEqual(len(r.data["data"][0]["fields"]), 1)

    def test_get_category_filter(self, _mock):
        client, _ = _make_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url, {"category": "warning_signs", "limit": 50})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        keys = {row["key"] for row in r.data["data"]}
        self.assertEqual(keys, {"visit_er_if_chest_pain"})
        for row in r.data["data"]:
            self.assertEqual(row["category"], "warning_signs")

    def test_exclude_repeated_params(self, _mock):
        client, _ = _make_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(f"{url}?specialty=cardiologist&exclude=adequate_rest&exclude=low_salt_diet")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        keys = {row["key"] for row in r.data["data"]}
        self.assertNotIn("adequate_rest", keys)
        self.assertNotIn("low_salt_diet", keys)

    def test_exclude_comma_separated(self, _mock):
        client, _ = _make_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url, {"specialty": "cardiologist", "exclude": "adequate_rest,low_salt_diet"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        keys = {row["key"] for row in r.data["data"]}
        self.assertNotIn("adequate_rest", keys)
        self.assertNotIn("low_salt_diet", keys)

    def test_limit_caps_results_meta_total_unchanged(self, _mock):
        client, _ = _make_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url, {"specialty": "cardiologist", "limit": 2})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["meta"]["total"], 4)
        self.assertEqual(r.data["meta"]["filtered"], 2)
        self.assertEqual(len(r.data["data"]), 2)

    def test_invalid_limit_too_low_400(self, _mock):
        client, _ = _make_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url, {"limit": 0})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_limit_too_high_400(self, _mock):
        client, _ = _make_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url, {"limit": 101})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_401(self, _mock):
        client = APIClient()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url)
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_non_doctor_403(self, _mock):
        client, _ = _make_authenticated_non_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    @patch("consultations_core.api.views.instruction_suggestions.logger.exception")
    @patch(
        "consultations_core.api.views.instruction_suggestions.get_instruction_suggestions",
        side_effect=FileNotFoundError("missing"),
    )
    def test_metadata_missing_500(self, _mock_get_suggestions, _mock_log_exception, _mock_loader):
        client, _ = _make_doctor_client()
        url = reverse(SUGGESTIONS_URL)
        r = client.get(url)
        self.assertEqual(r.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("detail", r.data)
