"""Error classification tests."""

from django.test import SimpleTestCase
from unittest.mock import MagicMock

from support_trace.lookup.enums import ErrorClassification
from support_trace.lookup.error_classification import ErrorClassificationBuilder
from support_trace.lookup.types import InvestigationTimeline
from support_trace.timeline.enums import TimelineSeverity
from support_trace.timeline.types import TimelineEvent, TimelineResult
from datetime import datetime, timezone


class ErrorClassificationTests(SimpleTestCase):
    def test_provider_error_from_tags(self) -> None:
        event = TimelineEvent(
            timeline_event_id="1",
            timestamp=datetime.now(timezone.utc),
            timeline_sequence=1,
            event="Provider failed",
            category="Business",
            severity=TimelineSeverity.ERROR,
            tags=("provider",),
            source="BusinessAudit",
            workflow_type="Booking",
            workflow_instance_id="wf",
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
            summary="",
            reference_id="r1",
            reference_type="business_audit",
            sequence_no=1,
            action="provider.failed",
        )
        timeline = InvestigationTimeline(result=TimelineResult(events=[event]))
        result = ErrorClassificationBuilder.classify(None, timeline)
        self.assertEqual(result, ErrorClassification.PROVIDER)
