"""Adapter unit tests."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from django.test import TestCase

from support_trace.timeline.adapters.business_adapter import BusinessAdapter
from support_trace.timeline.adapters.clinical_adapter import ClinicalAdapter
from support_trace.timeline.enums import TimelineCategory, TimelineSeverity, TimelineSource


class AdapterTests(TestCase):
    def test_clinical_adapter_maps_consultation_started(self) -> None:
        audit_id = str(uuid.uuid4())
        row = SimpleNamespace(
            id=audit_id,
            action="consultation.started",
            event="Consultation started",
            timestamp=datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc),
            correlation_id=str(uuid.uuid4()),
            patient_account_id=str(uuid.uuid4()),
            consultation_id=str(uuid.uuid4()),
            resource_type="consultation",
            resource_id=str(uuid.uuid4()),
            user_id="doctor-1",
            outcome="success",
            source="doctor",
            new_value={},
        )
        event = ClinicalAdapter().adapt(row)
        assert event is not None
        self.assertEqual(event.event, "Consultation Started")
        self.assertEqual(event.category, TimelineCategory.CLINICAL)
        self.assertEqual(event.severity, TimelineSeverity.INFO)
        self.assertEqual(event.source, TimelineSource.CLINICAL_AUDIT)
        self.assertIn("consultation", event.tags)

    def test_business_adapter_maps_routing_failed_critical(self) -> None:
        audit_id = str(uuid.uuid4())
        row = SimpleNamespace(
            id=audit_id,
            action="routing.failed",
            event="Routing failed",
            created_at=datetime(2026, 1, 1, 8, 14, tzinfo=timezone.utc),
            started_at=None,
            correlation_id=str(uuid.uuid4()),
            workflow_type="Routing",
            workflow_instance_id=str(uuid.uuid4()),
            parent_workflow_instance_id=str(uuid.uuid4()),
            resource_type="Decision",
            resource_id=str(uuid.uuid4()),
            category="Routing",
            status="Failed",
            state_before="Running",
            state_after="Failed",
            sequence_no=3,
            user_id=None,
            actor_type="System",
            new_value={"payload": {"patient_account_id": str(uuid.uuid4())}},
        )
        event = BusinessAdapter().adapt(row)
        assert event is not None
        self.assertEqual(event.severity, TimelineSeverity.CRITICAL)
        self.assertEqual(event.category, TimelineCategory.DECISION)
        self.assertEqual(event.sequence_no, 3)
