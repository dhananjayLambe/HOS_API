"""Tests for split registries."""

from __future__ import annotations

from django.test import TestCase

from support_trace.identifiers.detector_registry import DetectorRegistry
from support_trace.identifiers.extraction_registry import ExtractionRegistry
from support_trace.identifiers.normalization_registry import NormalizationRegistry
from support_trace.identifiers.validation_registry import ValidationRegistry


class RegistryTests(TestCase):
    def test_detector_registry_ranks_whatsapp_above_uuid(self) -> None:
        raw = "wamid.HBgL123456"
        results = DetectorRegistry.detect_all(raw)
        self.assertTrue(results)
        self.assertEqual(results[0].field_name, "whatsapp_message_id")

    def test_normalization_registry_phone(self) -> None:
        normalized = NormalizationRegistry.normalize("phone_number", "+91 98765 43210")
        self.assertEqual(normalized, "919876543210")

    def test_validation_registry_drops_invalid_phone(self) -> None:
        validated = ValidationRegistry.validate_dict({"phone_number": "123"})
        self.assertNotIn("phone_number", validated)

    def test_extraction_merge(self) -> None:
        merged = ExtractionRegistry.merge({"booking_id": "a"}, {"report_id": "b"})
        self.assertEqual(merged["booking_id"], "a")
        self.assertEqual(merged["report_id"], "b")
