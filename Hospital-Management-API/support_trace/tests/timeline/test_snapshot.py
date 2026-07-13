"""Snapshot and statistics tests."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from django.test import TestCase

from support_trace.timeline.enums import SnapshotWorkflowHealth
from support_trace.timeline.timeline_snapshot import TimelineSnapshotBuilder
from support_trace.timeline.timeline_statistics import TimelineStatisticsBuilder
from support_trace.timeline.types import TimelineEvent


class SnapshotStatisticsTests(TestCase):
    def test_snapshot_derives_completed_health(self) -> None:
        trace = SimpleNamespace(
            workflow_instance_id=str(uuid.uuid4()),
            workflow_type="Booking",
            current_state="Closed",
            workflow_step="Closed",
            status="Completed",
            workflow_health="Healthy",
            duration_ms=5000,
            retry_count=0,
            correlation_id=str(uuid.uuid4()),
        )
        snap = TimelineSnapshotBuilder.from_traces([trace])[0]
        self.assertEqual(snap.workflow_health, SnapshotWorkflowHealth.COMPLETED)

    def test_statistics_counts_events(self) -> None:
        ts = datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc)
        events = [
            TimelineEvent(
                timeline_event_id=str(uuid.uuid4()),
                timestamp=ts,
                timeline_sequence=1,
                event="A",
                category="Clinical",
                severity="Info",
                tags=(),
                source="ClinicalAudit",
                workflow_type=None,
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
                summary="a",
                reference_id=str(uuid.uuid4()),
                reference_type="clinical_audit",
                sequence_no=None,
                action="consultation.started",
            ),
            TimelineEvent(
                timeline_event_id=str(uuid.uuid4()),
                timestamp=datetime(2026, 1, 1, 8, 5, tzinfo=timezone.utc),
                timeline_sequence=2,
                event="B",
                category="Communication",
                severity="Critical",
                tags=("retry",),
                source="BusinessAudit",
                workflow_type="Routing",
                workflow_instance_id=str(uuid.uuid4()),
                parent_workflow_instance_id=None,
                correlation_id=str(uuid.uuid4()),
                patient_account_id=None,
                consultation_id=None,
                resource_type=None,
                resource_id=None,
                actor=None,
                status="Failed",
                state_before=None,
                state_after=None,
                summary="b",
                reference_id=str(uuid.uuid4()),
                reference_type="business_audit",
                sequence_no=1,
                action="routing.failed",
            ),
        ]
        stats = TimelineStatisticsBuilder.compute(events, [])
        self.assertEqual(stats.clinical_events, 1)
        self.assertEqual(stats.business_events, 1)
        self.assertEqual(stats.critical_events, 1)
        self.assertEqual(stats.retry_events, 1)
        self.assertIsNotNone(stats.timeline_duration_ms)
