import pytest
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status

from consultations_core.models.encounter import ClinicalEncounter
from queue_management.models import Queue
from tests.helpers.payloads import appointment_payload, check_in_payload, end_consultation_payload


@pytest.mark.django_db
@freeze_time("2026-07-01 10:00:00")
def test_queue_start_then_end_consultation_completes_encounter(
    authenticated_helpdesk_client,
    authenticated_doctor_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
    drug_master,
):
    r0 = authenticated_helpdesk_client.post(
        reverse("appointments:appointment-create"),
        appointment_payload(doctor, clinic, patient_account, patient_profile),
        format="json",
    )
    assert r0.status_code == status.HTTP_201_CREATED, r0.data
    appt_id = r0.data["id"]

    r2 = authenticated_helpdesk_client.post(
        reverse("queue-check-in"),
        check_in_payload(clinic, doctor, patient_account, patient_profile, appointment_id=appt_id),
        format="json",
    )
    assert r2.status_code == status.HTTP_201_CREATED, r2.data
    visit_id = r2.data["visit_id"]
    queue_id = r2.data["id"]

    r3 = authenticated_doctor_client.patch(
        reverse("queue-start"),
        {"queue_id": str(queue_id), "clinic_id": str(clinic.id)},
        format="json",
    )
    assert r3.status_code == status.HTTP_200_OK, r3.data

    enc = ClinicalEncounter.objects.get(id=visit_id)
    assert enc.status in ("consultation_in_progress", "in_consultation")

    r4 = authenticated_doctor_client.post(
        reverse("consultation-complete", kwargs={"encounter_id": visit_id}),
        end_consultation_payload(drug_id=drug_master.id),
        format="json",
    )
    assert r4.status_code == status.HTTP_200_OK, r4.data

    enc.refresh_from_db()
    assert enc.status in ("consultation_completed", "closed", "completed")

    q = Queue.objects.get(id=queue_id)
    q.refresh_from_db()
    assert q.status == "completed"
