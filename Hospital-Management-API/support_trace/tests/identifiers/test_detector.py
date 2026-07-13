"""Tests for identifier detection."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.identifiers.identifier_detector import IdentifierDetector
from support_trace.identifiers.types import IdentifierType


class DetectorTests(TestCase):
    def test_detect_whatsapp(self) -> None:
        detected = IdentifierDetector.detect_best("wamid.HBgLabc")
        self.assertIsNotNone(detected)
        assert detected is not None
        self.assertEqual(detected.identifier_type, IdentifierType.WHATSAPP_MESSAGE)
        self.assertIn("wamid", detected.reason)

    def test_detect_payment_prefix(self) -> None:
        detected = IdentifierDetector.detect_best("pay_abc123")
        self.assertIsNotNone(detected)
        assert detected is not None
        self.assertEqual(detected.identifier_type, IdentifierType.PAYMENT)

    def test_detect_phone_digits(self) -> None:
        detected = IdentifierDetector.detect_best("919876543210")
        self.assertIsNotNone(detected)
        assert detected is not None
        self.assertEqual(detected.identifier_type, IdentifierType.PHONE)

    def test_detect_uuid_candidates(self) -> None:
        booking_id = str(uuid.uuid4())
        results = IdentifierDetector.detect(booking_id)
        self.assertTrue(any(r.field_name == "booking_id" for r in results))
