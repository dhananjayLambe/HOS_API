"""Tests for GET/PATCH/DELETE /api/v1/templates/."""

import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from consultations_core.models.clinical_templates import ClinicalTemplate
from doctor.models import doctor as DoctorModel

User = get_user_model()

TEMPLATES_V1_URL = "/api/v1/templates/"


def _make_doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    u = User.objects.create_user(
        username=f"doc_tm_{uuid.uuid4().hex[:12]}",
        password="testpass123",
        first_name="Doc",
        last_name="Test",
    )
    u.groups.add(g)
    DoctorModel.objects.create(user=u)
    client = APIClient()
    client.force_authenticate(user=u)
    return client, u


class TemplateManagementAPITests(TestCase):
    def test_list_paginated_with_category_and_search(self):
        client, user = _make_doctor_client()
        ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="Viral Fever",
            consultation_type="FULL",
            template_data={"diagnosis": [{"name": "Fever"}]},
            usage_count=10,
        )
        ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="Cough Cold",
            consultation_type="QUICK_RX",
            template_data={"medicines": [{"name": "Paracetamol"}]},
            usage_count=5,
        )
        r = client.get(
            TEMPLATES_V1_URL,
            {"category": "full_consultation", "search": "viral", "ordering": "-usage_count"},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("count", r.data)
        self.assertIn("results", r.data)
        self.assertEqual(r.data["count"], 1)
        self.assertEqual(r.data["results"][0]["name"], "Viral Fever")
        self.assertEqual(r.data["results"][0]["category"], "full_consultation")
        self.assertEqual(r.data["results"][0]["usage_count"], 10)

    def test_retrieve_detail(self):
        client, user = _make_doctor_client()
        obj = ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="Diabetes Followup",
            consultation_type="FULL",
            template_data={"advice": "diet"},
        )
        r = client.get(f"{TEMPLATES_V1_URL}{obj.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["name"], "Diabetes Followup")
        self.assertEqual(r.data["template_data"], {"advice": "diet"})

    def test_patch_updates_name_and_template_data_only(self):
        client, user = _make_doctor_client()
        obj = ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="Old Name",
            consultation_type="FULL",
            template_data={"advice": "old"},
            usage_count=3,
        )
        r = client.patch(
            f"{TEMPLATES_V1_URL}{obj.id}/",
            {"name": "New Name", "template_data": {"advice": "new"}, "usage_count": 999},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("usage_count", r.data)

        r = client.patch(
            f"{TEMPLATES_V1_URL}{obj.id}/",
            {"name": "New Name", "template_data": {"advice": "new"}},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        obj.refresh_from_db()
        self.assertEqual(obj.name, "New Name")
        self.assertEqual(obj.template_data, {"advice": "new"})
        self.assertEqual(obj.usage_count, 3)

    def test_delete_soft_deletes(self):
        client, user = _make_doctor_client()
        obj = ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="To Delete",
            consultation_type="TEST_ONLY",
            template_data={"investigations": []},
        )
        r = client.delete(f"{TEMPLATES_V1_URL}{obj.id}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        obj.refresh_from_db()
        self.assertFalse(obj.is_active)
        r = client.get(TEMPLATES_V1_URL)
        self.assertEqual(r.data["count"], 0)

    def test_doctor_cannot_see_other_doctor_templates(self):
        client_a, user_a = _make_doctor_client()
        client_b, _ = _make_doctor_client()
        obj = ClinicalTemplate.objects.create(
            doctor=user_a.doctor,
            name="Private",
            consultation_type="FULL",
            template_data={"x": 1},
        )
        r = client_b.get(f"{TEMPLATES_V1_URL}{obj.id}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_clinical_template_create_visible_in_v1_list(self):
        """Templates saved during consultation (clinical-templates POST) appear in v1 management list."""
        from consultations_core.tests.test_clinical_template_api import CLINICAL_TEMPLATES_URL

        client, user = _make_doctor_client()
        payload = {
            "name": "Integration Template",
            "consultation_type": "FULL",
            "template_data": {
                "diagnosis": [{"diagnosis_label": "Fever"}],
                "follow_up": '{"date":"2026-04-23","interval":5,"unit":"days","reason":"","early_if_persist":false}',
            },
        }
        create_r = client.post(CLINICAL_TEMPLATES_URL, payload, format="json")
        self.assertEqual(create_r.status_code, status.HTTP_201_CREATED)

        list_r = client.get(TEMPLATES_V1_URL)
        self.assertEqual(list_r.status_code, status.HTTP_200_OK)
        self.assertEqual(list_r.data["count"], 1)
        row = list_r.data["results"][0]
        self.assertEqual(row["name"], "Integration Template")
        self.assertEqual(row["category"], "full_consultation")
        self.assertEqual(row["usage_count"], 0)

        detail_r = client.get(f"{TEMPLATES_V1_URL}{row['id']}/")
        self.assertEqual(detail_r.status_code, status.HTTP_200_OK)
        self.assertIn("follow_up", detail_r.data["template_data"])
        self.assertEqual(detail_r.data["template_data"]["diagnosis"][0]["diagnosis_label"], "Fever")

    def test_record_use_increments_usage_count(self):
        client, user = _make_doctor_client()
        obj = ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="Apply Me",
            consultation_type="FULL",
            template_data={"advice": "rest"},
            usage_count=2,
        )
        r = client.post(f"{TEMPLATES_V1_URL}{obj.id}/record-use/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["usage_count"], 3)
        obj.refresh_from_db()
        self.assertEqual(obj.usage_count, 3)

    def test_record_use_other_doctor_forbidden(self):
        client_a, user_a = _make_doctor_client()
        client_b, _ = _make_doctor_client()
        obj = ClinicalTemplate.objects.create(
            doctor=user_a.doctor,
            name="Not Yours",
            consultation_type="FULL",
            template_data={"x": 1},
        )
        r = client_b.post(f"{TEMPLATES_V1_URL}{obj.id}/record-use/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
