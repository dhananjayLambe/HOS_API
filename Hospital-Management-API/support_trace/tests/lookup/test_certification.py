"""Investigation certification validator tests."""

from django.test import SimpleTestCase
from unittest.mock import MagicMock

from support_trace.identifiers.types import IdentifierLookupResult
from support_trace.lookup.certification import InvestigationCertification
from support_trace.lookup.types import TraceLookupResult


class CertificationTests(SimpleTestCase):
    def test_primary_trace_missing_warns(self) -> None:
        lookup = IdentifierLookupResult(
            identifier="x",
            normalized="x",
            detected_type=None,
            matched_field="booking_id",
            matched_value="x",
            confidence=1.0,
            strategy="exact",
            traces=[MagicMock()],
            trace_count=1,
        )
        result = TraceLookupResult(identifier_lookup=lookup, primary_trace=None)
        warnings = InvestigationCertification.validate_primary_trace(result)
        self.assertTrue(warnings)

    def test_identifier_resolution_zero_confidence(self) -> None:
        lookup = IdentifierLookupResult(
            identifier="x",
            normalized="x",
            detected_type=None,
            matched_field="booking_id",
            matched_value="x",
            confidence=0.0,
            strategy="exact",
            traces=[MagicMock()],
            trace_count=1,
        )
        result = TraceLookupResult(identifier_lookup=lookup, primary_trace=MagicMock())
        warnings = InvestigationCertification.validate_identifier_resolution(result)
        self.assertTrue(warnings)
