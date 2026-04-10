import uuid
from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIRequestFactory

from diagnostics_engine.api.serializers.suggestions import (
    InvestigationSuggestionsQuerySerializer,
    InvestigationSuggestionsResponseSerializer,
)
from diagnostics_engine.api.views.suggestions import InvestigationSuggestionsAPIView
from diagnostics_engine.services.investigation_suggestions.cache import (
    invalidate_encounter_suggestions,
    set_cached_payload,
    suggestion_cache_pattern,
)
from diagnostics_engine.signals import invalidate_on_diagnosis_change, invalidate_on_order_item_change


def _sample_payload():
    return {
        "engine_version": "inv-suggest-v1",
        "selected_tests": [{"id": "svc-1"}],
        "common_tests": [
            {
                "id": "svc-2",
                "name": "CBC",
                "score": 0.31,
                "confidence": 0.45,
                "confidence_label": "Optional",
                "reason": "Commonly ordered",
                "badges": [],
            }
        ],
        "recommended_tests": [
            {
                "id": "svc-3",
                "name": "LFT",
                "score": 0.82,
                "confidence": 0.8,
                "confidence_label": "Highly Recommended",
                "reason": "Mapped from diagnosis",
                "badges": ["recently_done"],
            }
        ],
        "recommended_packages": [
            {
                "id": "pkg-1",
                "name": "Liver Care",
                "completion": "2/4",
                "missing_tests": ["Bilirubin"],
            }
        ],
        "popular_packages": [{"id": "pkg-2", "name": "Basic Health Panel"}],
    }


class SuggestionsContractTests(TestCase):
    def test_query_serializer_requires_encounter_id(self):
        serializer = InvestigationSuggestionsQuerySerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("encounter_id", serializer.errors)

    def test_response_serializer_accepts_contract_shape(self):
        serializer = InvestigationSuggestionsResponseSerializer(data=_sample_payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)


class SuggestionsViewTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def _build_request(self, encounter_id):
        raw = self.factory.get(
            "/api/diagnostics/investigations/suggestions/",
            {"encounter_id": str(encounter_id)},
        )
        view = InvestigationSuggestionsAPIView()
        request = view.initialize_request(raw)
        request.user = SimpleNamespace(doctor=SimpleNamespace(id="doc-1"))
        return view, request

    @patch("diagnostics_engine.api.views.suggestions.get_object_or_404")
    @patch("diagnostics_engine.api.views.suggestions.InvestigationSuggestionEngine")
    def test_get_returns_validated_payload(self, engine_cls, get_obj):
        encounter_id = uuid.uuid4()
        encounter = SimpleNamespace(id=encounter_id, doctor_id="doc-1")
        get_obj.return_value = encounter
        engine_cls.return_value.run.return_value = _sample_payload()

        view, request = self._build_request(encounter_id)
        response = view.get(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data.keys()), set(_sample_payload().keys()))

    @patch("diagnostics_engine.api.views.suggestions.get_object_or_404")
    def test_get_rejects_other_doctor_encounter(self, get_obj):
        encounter_id = uuid.uuid4()
        get_obj.return_value = SimpleNamespace(id=encounter_id, doctor_id="doc-2")

        view, request = self._build_request(encounter_id)
        with self.assertRaises(PermissionDenied):
            view.get(request)


class SuggestionsCacheTests(TestCase):
    @override_settings(INV_SUGGEST_CACHE_TTL_SECONDS=321)
    @patch("diagnostics_engine.services.investigation_suggestions.cache.cache")
    def test_set_cached_payload_uses_settings_ttl(self, mock_cache):
        set_cached_payload("k1", {"x": 1})
        mock_cache.set.assert_called_once_with("k1", {"x": 1}, 321)

    @patch("diagnostics_engine.services.investigation_suggestions.cache.cache")
    def test_invalidate_encounter_suggestions_deletes_by_pattern(self, mock_cache):
        encounter_id = str(uuid.uuid4())
        invalidate_encounter_suggestions(encounter_id)
        mock_cache.delete_pattern.assert_called_once_with(suggestion_cache_pattern(encounter_id))


class SuggestionsSignalTests(TestCase):
    @patch("diagnostics_engine.signals.invalidate_encounter_suggestions")
    def test_diagnosis_signal_invalidates_encounter_cache(self, invalidate_mock):
        instance = SimpleNamespace(consultation=SimpleNamespace(encounter_id=uuid.uuid4()))
        invalidate_on_diagnosis_change(sender=None, instance=instance)
        invalidate_mock.assert_called_once()

    @patch("diagnostics_engine.signals.invalidate_encounter_suggestions")
    def test_order_item_signal_invalidates_encounter_cache(self, invalidate_mock):
        instance = SimpleNamespace(order=SimpleNamespace(encounter_id=uuid.uuid4()))
        invalidate_on_order_item_change(sender=None, instance=instance)
        invalidate_mock.assert_called_once()
