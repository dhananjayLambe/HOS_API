"""Grouping and filter tests."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from django.test import TestCase

from support_trace.timeline.timeline_filter import TimelineFilterEngine
from support_trace.timeline.timeline_grouping import TimelineGrouping
from support_trace.timeline.types import TimelineEvent, TimelineFilter


def _event(**kwargs) -> TimelineEvent:
    defaults = dict(
        timeline_event_id=str(uuid.uuid4()),
        timestamp=datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc),
        timeline_sequence=1,
        event="Test",
        category="Communication",
        severity="Info",
        tags=("whatsapp",),
        source="BusinessAudit",
        workflow_type="ReportDelivery",
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
        reference_id=str(uuid.uuid4()),
        reference_type="business_audit",
        sequence_no=1,
        action="report.whatsapp_delivery",
    )
    defaults.update(kwargs)
    return TimelineEvent(**defaults)


class GroupingFilterTests(TestCase):
    def test_group_by_workflow(self) -> None:
        wf_id = str(uuid.uuid4())
        events = [_event(workflow_instance_id=wf_id), _event()]
        groups = TimelineGrouping.group_by_workflow(events)
        self.assertEqual(len(groups[wf_id]), 1)

    def test_filter_by_tag(self) -> None:
        events = [_event(tags=("whatsapp",)), _event(tags=("booking",))]
        filtered = TimelineFilterEngine.apply(
            events, TimelineFilter(tags=("whatsapp",))
        )
        self.assertEqual(len(filtered), 1)
        self.assertIn("whatsapp", filtered[0].tags)
