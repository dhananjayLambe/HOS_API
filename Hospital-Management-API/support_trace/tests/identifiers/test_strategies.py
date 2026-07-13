"""Tests for identifier strategies and registry."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.identifiers.constants import WHATSAPP_PREFIX
from support_trace.identifiers.identifier_registry import IDENTIFIER_REGISTRY, IdentifierRegistry
from support_trace.identifiers.lookup_keys import IDENTIFIER_FIELDS
from support_trace.identifiers.strategies import WhatsAppIdentifierStrategy
from support_trace.identifiers.types import IdentifierType


class StrategyRegistryTests(TestCase):
    def test_all_identifier_fields_have_strategy(self) -> None:
        registry_fields = {s.field_name for s in IDENTIFIER_REGISTRY}
        for field in IDENTIFIER_FIELDS:
            self.assertIn(field, registry_fields)

    def test_whatsapp_detect_high_confidence(self) -> None:
        strategy = WhatsAppIdentifierStrategy()
        detected = strategy.detect(f"{WHATSAPP_PREFIX}HBgLtest")
        self.assertIsNotNone(detected)
        assert detected is not None
        self.assertEqual(detected.identifier_type, IdentifierType.WHATSAPP_MESSAGE)
        self.assertGreaterEqual(detected.confidence, 0.99)
        self.assertEqual(detected.reason, "prefix wamid.")

    def test_booking_extract_from_business_audit(self) -> None:
        booking_id = str(uuid.uuid4())
        audit = type(
            "Audit",
            (),
            {
                "resource_type": BusinessResourceType.BOOKING,
                "workflow_type": WorkflowType.BOOKING,
                "resource_id": booking_id,
                "payload": {},
            },
        )()
        extracted = IdentifierRegistry.extract_from_audit(audit, source="BusinessAudit")
        self.assertEqual(extracted["booking_id"], booking_id.lower())
