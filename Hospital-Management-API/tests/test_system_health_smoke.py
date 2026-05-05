import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
def test_core_routes_respond_without_500(
    authenticated_helpdesk_client,
    authenticated_doctor_client,
    clinic,
    doctor,
):
    checks = [
        (
            authenticated_helpdesk_client,
            "get",
            reverse("helpdesk-clinic-queue-today"),
            None,
        ),
        (
            authenticated_helpdesk_client,
            "get",
            reverse("queue-details"),
            None,
        ),
        (
            authenticated_doctor_client,
            "get",
            reverse(
                "doctor-queue",
                kwargs={"doctor_id": str(doctor.id), "clinic_id": str(clinic.id)},
            ),
            None,
        ),
    ]
    for client, method, url, body in checks:
        resp = client.get(url) if method == "get" else client.post(url, body, format="json")
        assert resp.status_code in (
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        ), (url, resp.status_code, getattr(resp, "data", None))
