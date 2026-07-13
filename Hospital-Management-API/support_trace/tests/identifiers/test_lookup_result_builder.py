"""Tests for LookupResultBuilder metadata."""

from __future__ import annotations

from django.test import TestCase

from support_trace.identifiers.lookup_result_builder import LookupResultBuilder
from support_trace.identifiers.types import DetectedIdentifier, IdentifierType, SearchResult


class LookupResultBuilderTests(TestCase):
    def test_build_populates_metadata(self) -> None:
        detected = DetectedIdentifier(
            identifier_type=IdentifierType.PHONE,
            confidence=0.75,
            reason="12 digit phone",
            normalized="919876543210",
            field_name="phone_number",
        )
        result = LookupResultBuilder.build(
            raw="+91 98765 43210",
            detected=detected,
            search_result=SearchResult(
                traces=[],
                matched_field="phone_number",
                matched_value="919876543210",
                strategy="exact",
            ),
            related_traces=[],
            search_time_ms=1.5,
        )
        self.assertEqual(result.matched_field, "phone_number")
        self.assertEqual(result.strategy, "exact")
        self.assertEqual(result.search_time_ms, 1.5)
        self.assertEqual(result.confidence, 0.75)
