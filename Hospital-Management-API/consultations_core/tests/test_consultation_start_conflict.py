from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import connections
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APIClient

from tests.helpers.payloads import appointment_payload, check_in_payload


def _patch_start(doctor_user, clinic_id, queue_id):
    connections.close_all()
    c = APIClient()
    c.force_authenticate(user=doctor_user)
    return c.patch(
        reverse("queue-start"),
        {"queue_id": str(queue_id), "clinic_id": str(clinic_id)},
        format="json",
    )


@pytest.mark.transactional
@pytest.mark.django_db(transaction=True)
@freeze_time("2026-08-01 11:00:00")
def test_concurrent_queue_start_for_same_row_one_succeeds(
    authenticated_helpdesk_client,
    clinic,
    doctor,
    patient_account,
    patient_profile,
):
    r0 = authenticated_helpdesk_client.post(
        reverse("appointments:appointment-create"),
        appointment_payload(doctor, clinic, patient_account, patient_profile),
        format="json",
    )
    assert r0.status_code == status.HTTP_201_CREATED
    appt_id = r0.data["id"]

    r2 = authenticated_helpdesk_client.post(
        reverse("queue-check-in"),
        check_in_payload(clinic, doctor, patient_account, patient_profile, appointment_id=appt_id),
        format="json",
    )
    assert r2.status_code == status.HTTP_201_CREATED
    queue_id = r2.data["id"]

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda _: _patch_start(doctor.user, str(clinic.id), queue_id),
                range(2),
            )
        )

    statuses = {r.status_code for r in results}
    assert statuses.issubset({status.HTTP_200_OK, status.HTTP_409_CONFLICT}), results
    assert status.HTTP_200_OK in statuses
