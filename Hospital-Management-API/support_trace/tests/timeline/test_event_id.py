"""Stable timeline event ID tests."""

from __future__ import annotations

from datetime import datetime, timezone

from django.test import TestCase

from support_trace.timeline.event_id import generate_timeline_event_id


class EventIdTests(TestCase):
    def test_deterministic_id(self) -> None:
        ts = datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc)
        id1 = generate_timeline_event_id(
            reference_type="clinical_audit",
            reference_id="abc",
            timestamp=ts,
        )
        id2 = generate_timeline_event_id(
            reference_type="clinical_audit",
            reference_id="abc",
            timestamp=ts,
        )
        self.assertEqual(id1, id2)
