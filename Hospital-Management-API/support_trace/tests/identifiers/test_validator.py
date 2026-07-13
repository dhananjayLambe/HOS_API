"""Tests for identifier validation."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.identifiers.validation_registry import ValidationRegistry


class ValidatorTests(TestCase):
    def test_valid_uuid_accepted(self) -> None:
        booking_id = str(uuid.uuid4())
        validated = ValidationRegistry.validate_dict({"booking_id": booking_id})
        self.assertEqual(validated["booking_id"], booking_id.lower())

    def test_invalid_uuid_rejected(self) -> None:
        validated = ValidationRegistry.validate_dict({"booking_id": "not-a-uuid"})
        self.assertNotIn("booking_id", validated)
