import pytest
from django.urls import reverse
from rest_framework import status

from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import Prescription
from consultations_core.services.encounter_service import EncounterService
from tests.helpers.payloads import end_consultation_payload


@pytest.mark.django_db
def test_end_consultation_creates_active_prescription(
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

    url = reverse("consultation-complete", kwargs={"encounter_id": encounter.id})
    resp = authenticated_doctor_client.post(
        url,
        end_consultation_payload(drug_id=drug_master.id),
        format="json",
    )
    assert resp.status_code == status.HTTP_200_OK, resp.data

    consultation = encounter.consultation
    rx = Prescription.objects.filter(consultation=consultation, is_active=True).first()
    assert rx is not None
    assert rx.lines.count() >= 1
