from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import connections
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APIClient

from consultations_core.models.encounter import ClinicalEncounter
from tests.helpers.payloads import check_in_payload


def _check_in(user, url, body):
    connections.close_all()
    c = APIClient()
    c.force_authenticate(user=user)
    return c.post(url, body, format="json")


@pytest.mark.transactional
@pytest.mark.django_db(transaction=True)
@freeze_time("2026-05-01 09:00:00")
def test_concurrent_check_in_only_one_active_encounter(
    clinic,
    doctor,
    patient_account,
    patient_profile,
    helpdesk_user,
):
    url = reverse("queue-check-in")
    body = check_in_payload(clinic, doctor, patient_account, patient_profile)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: _check_in(helpdesk_user, url, body), range(2)))

    successes = [r for r in results if r.status_code == status.HTTP_201_CREATED]
    assert len(successes) >= 1
    # At most one active encounter per patient+clinic
    active = ClinicalEncounter.objects.filter(
        patient_account=patient_account,
        clinic=clinic,
        is_active=True,
    ).count()
    assert active <= 1
