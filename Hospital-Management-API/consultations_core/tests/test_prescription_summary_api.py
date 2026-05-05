import pytest
from django.urls import reverse
from rest_framework import status

from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.services.encounter_service import EncounterService
from tests.helpers.payloads import end_consultation_payload


@pytest.mark.django_db
def test_summary_lite_includes_prescriptions_after_complete(
    authenticated_doctor_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
    drug_master,
):
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=patient_account,
        patient_profile=patient_profile,
        doctor=doctor,
        created_by=doctor.user,
    )
    Consultation.objects.create(encounter=encounter)
    ClinicalEncounter.objects.filter(pk=encounter.pk).update(status="consultation_in_progress")
    encounter.refresh_from_db()

    complete_url = reverse("consultation-complete", kwargs={"encounter_id": encounter.id})
    r1 = authenticated_doctor_client.post(
        complete_url,
        end_consultation_payload(drug_id=drug_master.id),
        format="json",
    )
    assert r1.status_code == status.HTTP_200_OK, r1.data

    consultation = encounter.consultation
    sum_url = reverse("consultation-summary-lite", kwargs={"consultation_id": consultation.id})
    r2 = authenticated_doctor_client.get(sum_url)
    assert r2.status_code == status.HTTP_200_OK, r2.data
    prescriptions = r2.data.get("prescriptions") or []
    assert prescriptions
    row = prescriptions[0]
    assert row.get("drug_name")
    assert row.get("frequency_display") or row.get("dosage_display")
