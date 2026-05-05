import pytest
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status

from tests.helpers.payloads import appointment_payload


@pytest.mark.django_db
@freeze_time("2026-06-15 10:00:00")
def test_create_appointment_success(
    authenticated_helpdesk_client,
    doctor,
    clinic,
    patient_account,
    patient_profile,
):
    url = reverse("appointments:appointment-create")
    resp = authenticated_helpdesk_client.post(
        url,
        appointment_payload(doctor, clinic, patient_account, patient_profile),
        format="json",
    )
    assert resp.status_code == status.HTTP_201_CREATED, resp.data
    assert resp.data.get("status") == "scheduled"


@pytest.mark.django_db
@freeze_time("2026-06-15 10:00:00")
def test_create_appointment_past_date_rejected(
    authenticated_helpdesk_client,
    doctor,
    clinic,
    patient_account,
    patient_profile,
):
    url = reverse("appointments:appointment-create")
    body = appointment_payload(
        doctor,
        clinic,
        patient_account,
        patient_profile,
        appointment_date="2026-01-01",
        slot_start_time="10:00:00",
        slot_end_time="10:30:00",
    )
    resp = authenticated_helpdesk_client.post(url, body, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
