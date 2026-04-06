from types import SimpleNamespace
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory

from consultations_core.api.views.preconsultation import EndConsultationAPIView


class EndConsultationViewContractTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = EndConsultationAPIView()

    def _request(self, payload=None):
        raw = self.factory.post("/consultations/end/", payload or {}, format="json")
        request = self.view.initialize_request(raw)
        request.user = SimpleNamespace(id="user-1")
        return request

    @patch("consultations_core.api.views.preconsultation.get_object_or_404")
    def test_already_finalized_returns_400_contract(self, get_encounter):
        consultation = SimpleNamespace(
            is_finalized=True,
            ended_at=None,
            save=lambda **kwargs: None,
            refresh_from_db=lambda: None,
        )
        encounter = SimpleNamespace(
            status="consultation_in_progress",
            consultation=consultation,
            is_active=False,
            refresh_from_db=lambda: None,
            id="enc-1",
        )
        get_encounter.return_value = encounter

        response = self.view.post(self._request({}), "enc-1")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "error")
        self.assertIn("already ended", response.data["message"].lower())
        self.assertIn("consultation", response.data["errors"])

    @patch("consultations_core.api.views.preconsultation.EncounterStateMachine.complete_consultation")
    @patch("consultations_core.api.views.preconsultation.persist_consultation_end_state")
    @patch("consultations_core.api.views.preconsultation.get_object_or_404")
    def test_validation_error_returns_structured_errors(
        self, get_encounter, persist_end_state, _complete_consultation
    ):
        consultation = SimpleNamespace(
            is_finalized=False,
            ended_at=None,
            save=lambda **kwargs: None,
            refresh_from_db=lambda: None,
        )
        encounter = SimpleNamespace(
            status="consultation_in_progress",
            consultation=consultation,
            is_active=False,
            refresh_from_db=lambda: None,
            id="enc-1",
        )
        get_encounter.return_value = encounter
        persist_end_state.side_effect = ValidationError(
            {"medicines": ["Invalid medicine drug_id 'bad-id'."]}
        )

        response = self.view.post(self._request({"store": {"sectionItems": {"medicines": []}}}), "enc-1")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["message"], "Validation failed")
        self.assertIn("medicines", response.data["errors"])

    @patch("consultations_core.api.views.preconsultation.EncounterStateMachine.complete_consultation")
    @patch("consultations_core.api.views.preconsultation.persist_consultation_end_state")
    @patch("consultations_core.api.views.preconsultation.get_object_or_404")
    def test_success_contract_and_execution_order(
        self, get_encounter, persist_end_state, complete_consultation
    ):
        events = []

        def persist_side_effect(*args, **kwargs):
            events.append("persist")

        def complete_side_effect(*args, **kwargs):
            events.append("complete")

        persist_end_state.side_effect = persist_side_effect
        complete_consultation.side_effect = complete_side_effect

        consultation = SimpleNamespace(
            is_finalized=False,
            ended_at=None,
            save=lambda **kwargs: None,
            refresh_from_db=lambda: None,
        )
        encounter = SimpleNamespace(
            status="consultation_in_progress",
            consultation=consultation,
            is_active=False,
            refresh_from_db=lambda: None,
            id="enc-1",
        )
        get_encounter.return_value = encounter

        payload = {"store": {"sectionItems": {"symptoms": [], "findings": [], "diagnosis": [], "medicines": []}}}
        response = self.view.post(self._request(payload), "enc-1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["redirect_url"], "/doctor-dashboard")
        self.assertEqual(events, ["persist", "complete"])
