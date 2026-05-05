import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_real_jwt_accesses_encounter_detail(real_doctor_client, encounter_for_jwt):
    url = reverse("encounter-detail", kwargs={"encounter_id": encounter_for_jwt.id})
    resp = real_doctor_client.get(url)
    assert resp.status_code == status.HTTP_200_OK, resp.data
    assert resp.data.get("id") == str(encounter_for_jwt.id)


@pytest.mark.django_db
def test_tampered_jwt_rejected(api_client, encounter_for_jwt):
    api_client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token.here")
    url = reverse("encounter-detail", kwargs={"encounter_id": encounter_for_jwt.id})
    resp = api_client.get(url)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
