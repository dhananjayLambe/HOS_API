from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import connections
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APIClient

from tests.helpers.payloads import appointment_payload


def _post_booking(helpdesk_user, body, url):
    connections.close_all()
    c = APIClient()
    c.force_authenticate(user=helpdesk_user)
    return c.post(url, body, format="json")


@pytest.mark.transactional
@pytest.mark.django_db(transaction=True)
@freeze_time("2026-03-10 12:00:00")
def test_concurrent_double_book_same_slot_returns_one_conflict(
    clinic,
    doctor,
    patient_account,
    patient_profile,
    helpdesk_user,
):
    url = reverse("appointments:appointment-create")
    body = appointment_payload(doctor, clinic, patient_account, patient_profile)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(lambda _: _post_booking(helpdesk_user, body, url), range(2))
        )

    codes = sorted(r.status_code for r in results)
    assert codes == [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST], [
        (r.status_code, r.data) for r in results
    ]
