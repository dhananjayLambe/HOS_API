import pytest
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status

from consultations_core.models.encounter import ClinicalEncounter
from tests.factories.appointment import AppointmentFactory
from tests.helpers.payloads import appointment_payload, check_in_payload


@pytest.mark.django_db
@freeze_time("2026-04-01 08:00:00")
def test_check_in_returns_visit_id_and_encounter(
    authenticated_helpdesk_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
):
    appt = AppointmentFactory(
        patient_account=patient_account,
        patient_profile=patient_profile,
        doctor=doctor,
        clinic=clinic,
    )

    url = reverse("queue-check-in")
    resp = authenticated_helpdesk_client.post(
        url,
        check_in_payload(clinic, doctor, patient_account, patient_profile, appointment_id=appt.id),
        format="json",
    )
    assert resp.status_code == status.HTTP_201_CREATED, resp.data
    assert resp.data.get("visit_id")
    assert ClinicalEncounter.objects.filter(id=resp.data["visit_id"]).exists()
