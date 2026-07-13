"""Certification validator tests."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from django.test import TestCase

from support_trace.timeline.certification import TimelineCertification
from support_trace.timeline.types import TimelineEvent, TimelineGraph, TimelineResult


def _event(seq: int, ref_id: str | None = None) -> TimelineEvent:
    return TimelineEvent(
        timeline_event_id=str(uuid.uuid4()),
        timestamp=datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc),
        timeline_sequence=seq,
        event="Test",
        category="Business",
        severity="Info",
        tags=(),
        source="BusinessAudit",
        workflow_type="Booking",
        workflow_instance_id=str(uuid.uuid4()),
        parent_workflow_instance_id=None,
        correlation_id=str(uuid.uuid4()),
        patient_account_id=None,
        consultation_id=None,
        resource_type=None,
        resource_id=None,
        actor=None,
        status=None,
        state_before=None,
        state_after=None,
        summary="test",
        reference_id=ref_id or str(uuid.uuid4()),
        reference_type="business_audit",
        sequence_no=seq,
        action="booking.created",
    )


class CertificationTests(TestCase):
    def test_detects_duplicate_events(self) -> None:
        ref = str(uuid.uuid4())
        events = [_event(1, ref), _event(2, ref)]
        warnings = TimelineCertification.validate_no_duplicate_events(events)
        self.assertTrue(warnings)

    def test_monotonic_sequence_valid(self) -> None:
        events = [_event(1), _event(2)]
        result = TimelineResult(events=events, workflow_tree=TimelineGraph(nodes=(), edges=()))
        warnings = TimelineCertification.validate_monotonic_sequence(result.events)
        self.assertEqual(warnings, [])
