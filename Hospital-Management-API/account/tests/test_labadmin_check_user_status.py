"""CheckUserStatusView — labadmin onboarding states."""

from __future__ import annotations

import uuid

from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from account.models import User
from labs.choices.auth import LabType, LabUserRole, RegistrationStatus
from labs.models import LabAddress, LabBranch, LabOrganization, LabUser


class LabAdminCheckUserStatusTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("check-user-status")
        self.group, _ = Group.objects.get_or_create(name="labadmin")

    def _user(self, *, phone: str, is_active: bool = True) -> User:
        user = User.objects.create_user(
            username=phone,
            email=f"{phone}@test.example",
            password="testpass123",
            first_name="Lab",
            last_name="Admin",
            is_active=is_active,
        )
        user.groups.add(self.group)
        return user

    def _org_branch(self, *, registration_status: str):
        org = LabOrganization.objects.create(
            organization_name="Status Lab",
            display_name="Status Lab",
            organization_code=f"ORG{uuid.uuid4().hex[:6]}",
            slug=f"status-{uuid.uuid4().hex[:8]}",
            lab_type=LabType.PATHOLOGY_LAB,
            owner_name="Owner",
            primary_contact_number="9999999999",
            registration_status=registration_status,
        )
        branch = LabBranch.objects.create(
            organization=org,
            branch_name="Main",
            branch_code=f"BR{uuid.uuid4().hex[:6]}",
        )
        LabAddress.objects.create(
            branch=branch,
            address_line_1="1 Road",
            city="Pune",
            state="MH",
            pincode="411001",
        )
        return org, branch

    def test_labadmin_without_lab_user_registration_incomplete(self):
        phone = f"9{uuid.uuid4().int % 10**9:09d}"
        self._user(phone=phone, is_active=True)
        res = self.client.post(self.url, {"phone_number": phone}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["status"], "registration_incomplete")
        self.assertEqual(data["onboarding_state"], "REGISTRATION_INCOMPLETE")
        self.assertFalse(data["login_allowed"])

    def test_labadmin_pending_approval(self):
        phone = f"9{uuid.uuid4().int % 10**9:09d}"
        user = self._user(phone=phone, is_active=False)
        org, branch = self._org_branch(registration_status=RegistrationStatus.PENDING)
        LabUser.objects.create(
            user=user,
            organization=org,
            branch=branch,
            role=LabUserRole.ADMIN,
            is_primary_admin=True,
        )
        res = self.client.post(self.url, {"phone_number": phone}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["status"], "pending_approval")
        self.assertEqual(data["onboarding_state"], "PENDING_APPROVAL")
