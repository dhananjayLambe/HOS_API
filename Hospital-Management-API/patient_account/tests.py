from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from patient_account.api.views import PatientProfileSearchView


User = get_user_model()


class PatientProfileSearchViewTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = PatientProfileSearchView.as_view()
        self.helpdesk_group, _ = Group.objects.get_or_create(name="helpdesk")
        self.doctor_group, _ = Group.objects.get_or_create(name="doctor")
        self.patient_group, _ = Group.objects.get_or_create(name="patient")

        self.helpdesk_user = User.objects.create_user(username="9000000001")
        self.helpdesk_user.groups.add(self.helpdesk_group)

        self.patient_user = User.objects.create_user(username="9000000002")
        self.patient_user.groups.add(self.patient_group)

    @patch("patient_account.api.views.search_patients_for_suggestions")
    def test_search_returns_service_results_for_helpdesk(self, mock_search):
        mock_search.return_value = [
            {
                "id": "abc",
                "name": "Rahul Sharma",
                "full_name": "Rahul Sharma",
                "age": 32,
                "gender": "male",
                "mobile": "9876543210",
            }
        ]
        request = self.factory.get("/api/patients/search/?query=rahul&limit=10")
        force_authenticate(request, user=self.helpdesk_user)

        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["full_name"], "Rahul Sharma")
        mock_search.assert_called_once_with(query="rahul", limit="10")

    @patch("patient_account.api.views.search_patients_for_suggestions")
    def test_search_forbidden_for_non_helpdesk_or_doctor(self, mock_search):
        request = self.factory.get("/api/patients/search/?query=rahul")
        force_authenticate(request, user=self.patient_user)

        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        mock_search.assert_not_called()

    def test_search_requires_authentication(self):
        request = self.factory.get("/api/patients/search/?query=rahul")
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
