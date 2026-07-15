import uuid

from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from account.models import User
from labs.choices.auth import LabType, LabUserRole, RegistrationStatus
from labs.models import LabAddress, LabBranch, LabOrganization, LabUser


class LabSessionMeAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("lab-session-me")

    def _create_lab_fixtures(self, *, add_lab_user: bool = True):
        labadmin_group, _ = Group.objects.get_or_create(name="labadmin")
        user = User.objects.create_user(
            username=f"labuser_{uuid.uuid4().hex[:8]}",
            email="lab@test.example",
            password="testpass123",
            first_name="Lab",
            last_name="Admin",
        )
        user.groups.add(labadmin_group)

        org = LabOrganization.objects.create(
            organization_name="Test Lab Org",
            display_name="Test Display",
            organization_code=f"ORG{uuid.uuid4().hex[:6]}",
            slug=f"test-lab-{uuid.uuid4().hex[:8]}",
            lab_type=LabType.PATHOLOGY_LAB,
            owner_name="Owner",
            primary_contact_number="9999999999",
            registration_status=RegistrationStatus.APPROVED,
            is_verified=True,
            is_active_for_orders=True,
        )
        branch = LabBranch.objects.create(
            organization=org,
            branch_name="Pune Branch",
            branch_code=f"BR{uuid.uuid4().hex[:6]}",
            home_collection_available=True,
            is_active_for_orders=True,
        )
        LabAddress.objects.create(
            branch=branch,
            address_line_1="1 MG Road",
            city="Pune",
            state="MH",
            pincode="411001",
        )
        if add_lab_user:
            LabUser.objects.create(
                user=user,
                organization=org,
                branch=branch,
                role=LabUserRole.ADMIN,
                employee_code="EMP001",
                is_primary_admin=True,
            )
        return user

    def test_labadmin_with_lab_user_returns_200_and_shape(self):
        user = self._create_lab_fixtures(add_lab_user=True)
        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn("user", data)
        self.assertIn("lab_user", data)
        self.assertIn("organization", data)
        self.assertIn("branch", data)
        self.assertIn("permissions", data)
        self.assertEqual(data["user"]["email"], "lab@test.example")
        self.assertEqual(data["lab_user"]["role"], LabUserRole.ADMIN)
        self.assertEqual(data["organization"]["display_name"], "Test Display")
        self.assertEqual(data["branch"]["branch_name"], "Pune Branch")
        self.assertEqual(data["branch"]["city"], "Pune")
        self.assertEqual(data["branch"]["address_line_1"], "1 MG Road")
        self.assertEqual(data["user"]["username"], user.username)
        self.assertIn("slug", data["organization"])
        self.assertTrue(data["permissions"]["can_upload_reports"])
        self.assertTrue(data.get("operational_access"))
        self.assertTrue(data["permissions"].get("can_access_dashboard"))
        self.assertEqual(data.get("registration_status"), RegistrationStatus.APPROVED)
        self.assertFalse(data.get("approval_required"))

    def test_non_lab_group_user_forbidden(self):
        user = User.objects.create_user(
            username=f"doc_{uuid.uuid4().hex[:8]}",
            email="doc@test.example",
            password="testpass123",
            first_name="Doc",
            last_name="Tor",
        )
        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_labadmin_without_lab_user_returns_404_with_code(self):
        user = self._create_lab_fixtures(add_lab_user=False)
        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        data = res.json()
        self.assertEqual(data.get("code"), "lab_profile_missing")
        self.assertIn("detail", data)

    def test_pending_org_me_returns_200_without_operational_access(self):
        user = self._create_lab_fixtures(add_lab_user=True)
        lab_user = LabUser.objects.get(user=user)
        org = lab_user.organization
        org.registration_status = RegistrationStatus.PENDING
        org.save(update_fields=["registration_status"])

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["registration_status"], RegistrationStatus.PENDING)
        self.assertFalse(data["operational_access"])
        self.assertTrue(data["approval_required"])
        self.assertFalse(data["permissions"]["can_access_dashboard"])
        self.assertFalse(data["permissions"]["can_upload_reports"])
