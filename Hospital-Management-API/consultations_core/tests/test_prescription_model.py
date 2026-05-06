import pytest
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status

from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import Prescription
from consultations_core.services.encounter_service import EncounterService
from tests.helpers.payloads import end_consultation_payload
from tests.factories.doctor import DoctorFactory, ensure_doctor_group


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


def _create_finalized_prescription(
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
    response = authenticated_doctor_client.post(
        complete_url,
        end_consultation_payload(drug_id=drug_master.id),
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK, response.data
    consultation = encounter.consultation
    prescription = Prescription.objects.filter(consultation=consultation, is_active=True).first()
    assert prescription is not None
    return consultation, prescription


@pytest.mark.django_db
def test_cancel_finalized_prescription_success_and_metadata(
    authenticated_doctor_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
    drug_master,
):
    consultation, prescription = _create_finalized_prescription(
        authenticated_doctor_client,
        clinic,
        doctor,
        patient_account,
        patient_profile,
        drug_master,
    )
    lines_before = list(
        prescription.lines.values_list("id", "drug_name_snapshot", "dose_value", "duration_value")
    )
    url = reverse("consultation-prescription-cancel", kwargs={"consultation_id": consultation.id})
    response = authenticated_doctor_client.post(
        url,
        {"reason_code": "incorrect_medicine_added", "reason_text": "Wrong strength", "source": "doctor"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK, response.data
    prescription.refresh_from_db()
    assert prescription.status == "cancelled"
    assert prescription.cancelled_at is not None
    assert prescription.cancelled_by_id == doctor.user_id
    assert prescription.cancelled_by_source == "doctor"
    assert prescription.cancel_reason_code == "incorrect_medicine_added"
    assert prescription.cancel_reason_text == "Wrong strength"
    lines_after = list(
        prescription.lines.values_list("id", "drug_name_snapshot", "dose_value", "duration_value")
    )
    assert lines_before == lines_after


@pytest.mark.django_db
def test_cancel_prescription_is_idempotent(
    authenticated_doctor_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
    drug_master,
):
    consultation, _ = _create_finalized_prescription(
        authenticated_doctor_client,
        clinic,
        doctor,
        patient_account,
        patient_profile,
        drug_master,
    )
    url = reverse("consultation-prescription-cancel", kwargs={"consultation_id": consultation.id})
    first = authenticated_doctor_client.post(
        url,
        {"reason_code": "duplicate_rx", "reason_text": "", "source": "doctor"},
        format="json",
    )
    second = authenticated_doctor_client.post(
        url,
        {"reason_code": "duplicate_rx", "reason_text": "", "source": "doctor"},
        format="json",
    )
    assert first.status_code == status.HTTP_200_OK, first.data
    assert second.status_code == status.HTTP_200_OK, second.data


@pytest.mark.django_db
def test_cancel_prescription_forbidden_for_wrong_doctor(
    api_client,
    authenticated_doctor_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
    drug_master,
):
    consultation, _ = _create_finalized_prescription(
        authenticated_doctor_client,
        clinic,
        doctor,
        patient_account,
        patient_profile,
        drug_master,
    )
    another_doc = DoctorFactory()
    another_doc.clinics.add(clinic)
    ensure_doctor_group(another_doc.user)
    api_client.force_authenticate(user=another_doc.user)
    url = reverse("consultation-prescription-cancel", kwargs={"consultation_id": consultation.id})
    response = api_client.post(
        url,
        {"reason_code": "incorrect_medicine_added", "reason_text": "", "source": "doctor"},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN, response.data


@pytest.mark.django_db
def test_finalize_guard_still_blocks_general_mutation_after_finalized(
    authenticated_doctor_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
    drug_master,
):
    _, prescription = _create_finalized_prescription(
        authenticated_doctor_client,
        clinic,
        doctor,
        patient_account,
        patient_profile,
        drug_master,
    )
    prescription.prescription_pnr = f"{prescription.prescription_pnr}-X"
    with pytest.raises(ValidationError):
        prescription.save(update_fields=["prescription_pnr"])
