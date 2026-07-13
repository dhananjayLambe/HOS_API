"""Support API test helpers."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

User = get_user_model()


def support_api_client(*, group_name: str = "helpdesk") -> tuple[APIClient, object]:
    user = User.objects.create_user(
        username=f"support-api-{group_name}",
        email=f"{group_name}@test.com",
        password="testpass123",
    )
    group, _ = Group.objects.get_or_create(name=group_name)
    user.groups.add(group)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user
