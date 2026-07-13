"""API envelope certification tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.api.response_builder import API_VERSION
from support_trace.certification.api_validator import ApiValidator


class ApiCertificationTests(SimpleTestCase):
    def test_valid_envelope(self) -> None:
        payload = {
            "success": True,
            "request_id": "req-1",
            "data": {},
            "metadata": {"api_version": API_VERSION, "investigation_id": "inv-1"},
        }
        warnings, score = ApiValidator.validate_envelope(payload)
        self.assertEqual(score, 1.0)

    def test_missing_keys(self) -> None:
        warnings, score = ApiValidator.validate_envelope({"success": True})
        self.assertGreater(len(warnings), 0)
