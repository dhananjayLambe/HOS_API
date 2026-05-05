import pytest
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status

from consultations_core.models.consultation import Consultation
from tests.helpers.payloads import (
    appointment_payload,
    check_in_payload,
    end_consultation_payload,
)


@pytest.mark.integration
@pytest.mark.django_db
@freeze_time("2026-01-01 09:00:00")
def test_helpdesk_chain_to_prescription_summary(
    authenticated_helpdesk_client,
    authenticated_doctor_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
    drug_master,
):
    appt_url = reverse("appointments:appointment-create")
    r1 = authenticated_helpdesk_client.post(
        appt_url,
        appointment_payload(doctor, clinic, patient_account, patient_profile),
        format="json",
    )
    assert r1.status_code == status.HTTP_201_CREATED, r1.data
    appt_id = r1.data["id"]

    chk_url = reverse("queue-check-in")
    r2 = authenticated_helpdesk_client.post(
        chk_url,
        check_in_payload(clinic, doctor, patient_account, patient_profile, appointment_id=appt_id),
        format="json",
    )
    assert r2.status_code == status.HTTP_201_CREATED, r2.data
    visit_id = r2.data.get("visit_id")
    queue_id = r2.data.get("id")
    assert visit_id, r2.data

    start_url = reverse("queue-start")
    r3 = authenticated_doctor_client.patch(
        start_url,
        {"queue_id": str(queue_id), "clinic_id": str(clinic.id)},
        format="json",
    )
    assert r3.status_code == status.HTTP_200_OK, r3.data

    complete_url = reverse("consultation-complete", kwargs={"encounter_id": visit_id})
    r4 = authenticated_doctor_client.post(
        complete_url,
        end_consultation_payload(drug_id=drug_master.id),
        format="json",
    )
    assert r4.status_code == status.HTTP_200_OK, r4.data

    consultation = Consultation.objects.get(encounter_id=visit_id)
    sum_url = reverse("consultation-summary-lite", kwargs={"consultation_id": consultation.id})
    r5 = authenticated_doctor_client.get(sum_url)
    assert r5.status_code == status.HTTP_200_OK, r5.data

    prescriptions = r5.data.get("prescriptions") or []
    assert prescriptions, f"expected prescriptions in summary, got keys={list(r5.data.keys())}"
    first = prescriptions[0]
    assert first.get("drug_name"), first
    assert first.get("dosage_display") or first.get("dose_display_numeric"), first
    assert first.get("frequency_display"), first
