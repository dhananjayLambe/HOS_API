"""Tests for normalization rules."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.identifiers.normalization_registry import NormalizationRegistry


class NormalizationTests(TestCase):
    def test_uuid_lowercase(self) -> None:
        raw = str(uuid.uuid4()).upper()
        normalized = NormalizationRegistry.normalize("booking_id", raw)
        self.assertEqual(normalized, raw.lower())

    def test_provider_reference_trim(self) -> None:
        normalized = NormalizationRegistry.normalize("provider_reference", "  ref-1  ")
        self.assertEqual(normalized, "ref-1")
