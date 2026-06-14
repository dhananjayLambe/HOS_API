"""Tests for helpdesk clinical visits API (/api/v1/visits/)."""

import pytest
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time
from rest_framework import status

from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.services.encounter_service import EncounterService
from tests.factories.clinic import ClinicFactory
from tests.factories.helpdesk import HelpdeskClinicUserFactory, ensure_helpdesk_group


@pytest.fixture
def other_clinic(db):
    return ClinicFactory()


@pytest.fixture
def other_helpdesk_client(other_clinic):
    from rest_framework.test import APIClient

    h = HelpdeskClinicUserFactory(clinic=other_clinic)
    ensure_helpdesk_group(h.user)
    client = APIClient()
    client.force_authenticate(user=h.user)
    return client


def _create_checked_in_encounter(
    *,
    clinic,
    doctor,
    patient_account,
    patient_profile,
    encounter_type="walk_in",
    status="consultation_completed",
    is_active=False,
):
    enc, _ = EncounterService.get_or_create_encounter(
        clinic=clinic,
        patient_account=patient_account,
        patient_profile=patient_profile,
        doctor=doctor,
        appointment=None,
        encounter_type=encounter_type,
        entry_mode="helpdesk",
        created_by=doctor.user,
        consultation_type="FULL",
    )
    enc.check_in_time = timezone.now()
    enc.status = status
    enc.is_active = is_active
    enc.save(update_fields=["check_in_time", "status", "is_active"])
    return enc


@pytest.mark.django_db
@freeze_time("2026-06-14 10:00:00")
def test_helpdesk_lists_visits_in_assigned_clinic(
    authenticated_helpdesk_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
):
    enc = _create_checked_in_encounter(
        clinic=clinic,
        doctor=doctor,
        patient_account=patient_account,
        patient_profile=patient_profile,
    )

    url = reverse("clinical-visits-list")
    resp = authenticated_helpdesk_client.get(url)
    assert resp.status_code == status.HTTP_200_OK, resp.data
    assert resp.data["total"] >= 1
    ids = {row["visit_id"] for row in resp.data["results"]}
    assert str(enc.id) in ids
    row = next(r for r in resp.data["results"] if r["visit_id"] == str(enc.id))
    assert row["visit_pnr"] == enc.visit_pnr
    assert row["status"] == "CONSULTATION_COMPLETED"
    assert row["visit_type"] == "WALK_IN"


@pytest.mark.django_db
@freeze_time("2026-06-14 10:00:00")
def test_helpdesk_cannot_detail_visit_from_other_clinic(
    authenticated_helpdesk_client,
    other_clinic,
    doctor,
    patient_account,
    patient_profile,
    other_helpdesk_client,
):
    other_doc = doctor
    other_doc.clinics.add(other_clinic)
    enc = _create_checked_in_encounter(
        clinic=other_clinic,
        doctor=other_doc,
        patient_account=patient_account,
        patient_profile=patient_profile,
    )

    url = reverse("clinical-visit-detail", kwargs={"visit_id": enc.id})
    resp = authenticated_helpdesk_client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND

    ok = other_helpdesk_client.get(url)
    assert ok.status_code == status.HTTP_200_OK, ok.data
    assert ok.data["visit_id"] == str(enc.id)


@pytest.mark.django_db
@freeze_time("2026-06-14 10:00:00")
def test_visit_list_filters_by_status_and_type(
    authenticated_helpdesk_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
):
    completed = _create_checked_in_encounter(
        clinic=clinic,
        doctor=doctor,
        patient_account=patient_account,
        patient_profile=patient_profile,
        encounter_type="appointment",
    )
    in_progress = _create_checked_in_encounter(
        clinic=clinic,
        doctor=doctor,
        patient_account=patient_account,
        patient_profile=patient_profile,
        encounter_type="walk_in",
        status="consultation_in_progress",
        is_active=True,
    )

    base = reverse("clinical-visits-list")

    completed_resp = authenticated_helpdesk_client.get(base, {"status": "COMPLETED"})
    assert completed_resp.status_code == status.HTTP_200_OK
    completed_ids = {r["visit_id"] for r in completed_resp.data["results"]}
    assert str(completed.id) in completed_ids
    assert str(in_progress.id) not in completed_ids

    type_resp = authenticated_helpdesk_client.get(base, {"visit_type": "APPOINTMENT"})
    assert type_resp.status_code == status.HTTP_200_OK
    type_ids = {r["visit_id"] for r in type_resp.data["results"]}
    assert str(completed.id) in type_ids
    assert str(in_progress.id) not in type_ids


@pytest.mark.django_db
@freeze_time("2026-06-14 10:00:00")
def test_visit_list_search_by_pnr(
    authenticated_helpdesk_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
):
    enc = _create_checked_in_encounter(
        clinic=clinic,
        doctor=doctor,
        patient_account=patient_account,
        patient_profile=patient_profile,
    )

    url = reverse("clinical-visits-list")
    resp = authenticated_helpdesk_client.get(url, {"search": enc.visit_pnr[:8]})
    assert resp.status_code == status.HTTP_200_OK
    assert any(r["visit_id"] == str(enc.id) for r in resp.data["results"])


@pytest.mark.django_db
@freeze_time("2026-06-14 10:00:00")
def test_visit_list_pagination(
    authenticated_helpdesk_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
):
    from tests.factories.patient import PatientProfileFactory

    profiles = [patient_profile]
    for _ in range(2):
        profiles.append(PatientProfileFactory(account=patient_account))

    for profile in profiles:
        _create_checked_in_encounter(
            clinic=clinic,
            doctor=doctor,
            patient_account=patient_account,
            patient_profile=profile,
        )

    url = reverse("clinical-visits-list")
    resp = authenticated_helpdesk_client.get(url, {"page": 1, "page_size": 2})
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.data["results"]) == 2
    assert resp.data["page"] == 1
    assert resp.data["page_size"] == 2
    assert resp.data["total"] >= 3


@pytest.mark.django_db
@freeze_time("2026-06-14 10:00:00")
def test_dashboard_summary(
    authenticated_helpdesk_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
):
    _create_checked_in_encounter(
        clinic=clinic,
        doctor=doctor,
        patient_account=patient_account,
        patient_profile=patient_profile,
    )

    url = reverse("clinical-visits-dashboard-summary")
    resp = authenticated_helpdesk_client.get(url)
    assert resp.status_code == status.HTTP_200_OK, resp.data
    assert resp.data["today_visits"] >= 1
    assert resp.data["completed_visits"] >= 1
    assert "followups" in resp.data
