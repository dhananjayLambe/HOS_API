"""Merger and sorter tests."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from django.test import TestCase

from support_trace.timeline.timeline_merger import TimelineMerger
from support_trace.timeline.types import TimelineEvent


def _event(
    *,
    ref_type: str,
    ref_id: str,
    ts: datetime,
    seq: int | None = None,
    category: str = "Business",
) -> TimelineEvent:
    return TimelineEvent(
        timeline_event_id=str(uuid.uuid4()),
        timestamp=ts,
        timeline_sequence=0,
        event="Test",
        category=category,
        severity="Info",
        tags=(),
        source="BusinessAudit",
        workflow_type=None,
        workflow_instance_id=None,
        parent_workflow_instance_id=None,
        correlation_id=None,
        patient_account_id=None,
        consultation_id=None,
        resource_type=None,
        resource_id=None,
        actor=None,
        status=None,
        state_before=None,
        state_after=None,
        summary="test",
        reference_id=ref_id,
        reference_type=ref_type,
        sequence_no=seq,
        action=None,
    )


class MergerSorterTests(TestCase):
    def test_merge_dedupes_and_assigns_sequence(self) -> None:
        ts = datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc)
        e1 = _event(ref_type="clinical_audit", ref_id="a", ts=ts, category="Clinical")
        e2 = _event(ref_type="business_audit", ref_id="b", ts=ts)
        e1_dup = _event(ref_type="clinical_audit", ref_id="a", ts=ts, category="Clinical")
        merged = TimelineMerger.merge([e1, e2], [e1_dup])
        self.assertEqual(len(merged), 2)
        self.assertEqual(merged[0].timeline_sequence, 1)
        self.assertEqual(merged[1].timeline_sequence, 2)

    def test_same_timestamp_uses_sequence_no(self) -> None:
        ts = datetime(2026, 1, 1, 8, 10, tzinfo=timezone.utc)
        e1 = _event(ref_type="business_audit", ref_id="b", ts=ts, seq=2)
        e2 = _event(ref_type="business_audit", ref_id="a", ts=ts, seq=1)
        merged = TimelineMerger.merge([e1, e2])
        self.assertEqual(merged[0].reference_id, "a")
        self.assertEqual(merged[1].reference_id, "b")
