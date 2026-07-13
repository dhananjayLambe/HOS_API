"""Unit tests for SupportTraceBuilder normalization."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.domain.builders import SupportTraceBuilder
from support_trace.domain.lookup_keys import normalize_phone
from support_trace.enums import SyncStatus, TraceSource, TraceStatus, WorkflowHealth
from support_trace.tests.support import setup_trace_context


class SupportTraceBuilderTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_prepare_merges_log_context(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context(
            booking_id=str(uuid.uuid4()),
            patient_account_id=str(uuid.uuid4()),
        )
        prepared = SupportTraceBuilder.prepare_validated_fields(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(uuid.uuid4()),
            organization_id=str(clinic.id),
            status=TraceStatus.RUNNING,
            last_event="booking.created",
            last_source=TraceSource.SYSTEM,
            sync_status=SyncStatus.PENDING,
            workflow_health=WorkflowHealth.HEALTHY,
            correlation_id=corr_id,
        )
        self.assertEqual(prepared["correlation_id"], corr_id)
        self.assertEqual(prepared["workflow_instance_id"], wf_id)
        self.assertIsNotNone(prepared["booking_id"])
        self.assertIsNotNone(prepared["patient_account_id"])
        self.assertIn("search_vector", prepared)

    def test_builder_does_not_set_duration(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        prepared = SupportTraceBuilder.prepare_validated_fields(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(uuid.uuid4()),
            organization_id=str(clinic.id),
            status=TraceStatus.COMPLETED,
            last_event="done",
            last_source=TraceSource.SYSTEM,
            sync_status=SyncStatus.INDEXED,
            workflow_health=WorkflowHealth.HEALTHY,
            correlation_id=corr_id,
        )
        self.assertIsNone(prepared.get("duration_ms"))

    def test_normalize_phone(self) -> None:
        self.assertEqual(normalize_phone("+91 99999 99999"), "919999999999")
