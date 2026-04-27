from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


class LogoutApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/logout/"
        self.user = get_user_model().objects.create_user(
            username="9999999999",
            password="test-pass-123",
            first_name="Help",
            last_name="Desk",
        )

    def test_logout_requires_refresh_token(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_logout_with_valid_refresh_token_returns_success(self):
        refresh = RefreshToken.for_user(self.user)
        response = self.client.post(
            self.url,
            {"refresh_token": str(refresh)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("message"), "Logged out successfully")

    def test_logout_with_already_blacklisted_token_is_idempotent(self):
        refresh = RefreshToken.for_user(self.user)
        token = str(refresh)

        first = self.client.post(self.url, {"refresh_token": token}, format="json")
        second = self.client.post(self.url, {"refresh_token": token}, format="json")

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data.get("message"), "Logged out successfully")
