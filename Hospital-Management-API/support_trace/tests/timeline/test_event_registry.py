"""Event registry tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.timeline.constants import CERTIFICATION_REQUIRED_ACTIONS
from support_trace.timeline.event_registry import EventRegistry
from support_trace.timeline.enums import TimelineSeverity


class EventRegistryTests(TestCase):
    def test_known_action_resolved(self) -> None:
        spec = EventRegistry.get("booking.created")
        self.assertIsNotNone(spec)
        assert spec is not None
        self.assertEqual(spec.title, "Booking Created")

    def test_unknown_action_fallback(self) -> None:
        spec = EventRegistry.resolve("unknown.action", fallback_event="Raw", fallback_category="Business")
        self.assertEqual(spec.title, "Raw")
        self.assertEqual(spec.severity, TimelineSeverity.INFO)

    def test_certification_actions_registered(self) -> None:
        for action in CERTIFICATION_REQUIRED_ACTIONS:
            self.assertIsNotNone(
                EventRegistry.get(action),
                f"missing registry entry for {action}",
            )
