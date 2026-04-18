"""Tests for POST/GET /api/consultations/clinical-templates/."""

import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from consultations_core.models.clinical_templates import ClinicalTemplate
from doctor.models import doctor as DoctorModel

User = get_user_model()

CLINICAL_TEMPLATES_URL = "/api/consultations/clinical-templates/"


def _make_doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    u = User.objects.create_user(
        username=f"doc_ct_{uuid.uuid4().hex[:12]}",
        password="testpass123",
        first_name="Doc",
        last_name="Test",
    )
    u.groups.add(g)
    DoctorModel.objects.create(user=u)
    client = APIClient()
    client.force_authenticate(user=u)
    return client, u


class ClinicalTemplateAPITests(TestCase):
    def test_post_creates_template(self):
        client, user = _make_doctor_client()
        payload = {
            "name": "Hypertension Adult",
            "consultation_type": "FULL",
            "template_data": {"diagnosis": [], "advice": "rest"},
        }
        r = client.post(CLINICAL_TEMPLATES_URL, payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["name"], "Hypertension Adult")
        self.assertEqual(r.data["consultation_type"], "FULL")
        obj = ClinicalTemplate.objects.get(id=r.data["id"])
        self.assertEqual(obj.doctor_id, user.doctor.id)

    def test_post_rejects_empty_template_data(self):
        client, _ = _make_doctor_client()
        r = client.post(
            CLINICAL_TEMPLATES_URL,
            {"name": "X", "consultation_type": "FULL", "template_data": {}},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_duplicate_name(self):
        client, user = _make_doctor_client()
        ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="Dup",
            consultation_type="FULL",
            template_data={"a": 1},
        )
        r = client.post(
            CLINICAL_TEMPLATES_URL,
            {
                "name": "Dup",
                "consultation_type": "QUICK_RX",
                "template_data": {"b": 2},
            },
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", r.data)

    def test_get_list_filters(self):
        client, user = _make_doctor_client()
        ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="Hypertension Adult",
            consultation_type="FULL",
            template_data={"x": 1},
        )
        ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="Other",
            consultation_type="QUICK_RX",
            template_data={"y": 1},
        )
        r = client.get(
            CLINICAL_TEMPLATES_URL,
            {"type": "FULL", "search": "hyper"},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsInstance(r.data, list)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["name"], "Hypertension Adult")

    def test_get_returns_bare_list_not_paginated(self):
        client, user = _make_doctor_client()
        ClinicalTemplate.objects.create(
            doctor=user.doctor,
            name="T",
            consultation_type="FULL",
            template_data={"k": 1},
        )
        r = client.get(CLINICAL_TEMPLATES_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsInstance(r.data, list)
