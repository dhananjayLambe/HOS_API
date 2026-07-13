"""Tests for trace_version optimistic concurrency."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.domain.fingerprint import compute_workflow_fingerprint
from support_trace.domain.repository import SupportTraceRepository
from support_trace.enums import SyncStatus, TraceSource, TraceStatus, WorkflowHealth
from support_trace.exceptions import SupportTraceConcurrencyError
from support_trace.tests.support import setup_trace_context


class ConcurrencyTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_concurrency_error_on_stale_version(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        res_id = str(uuid.uuid4())
        fp = compute_workflow_fingerprint(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_id=res_id,
            organization_id=str(clinic.id),
        )
        base = {
            "correlation_id": corr_id,
            "workflow_instance_id": wf_id,
            "workflow_type": WorkflowType.BOOKING,
            "resource_type": BusinessResourceType.BOOKING,
            "resource_id": res_id,
            "organization_id": str(clinic.id),
            "status": TraceStatus.RUNNING,
            "last_event": "start",
            "workflow_fingerprint": fp,
            "last_source": TraceSource.SYSTEM,
            "sync_status": SyncStatus.INDEXED,
            "workflow_health": WorkflowHealth.HEALTHY,
        }
        repo = SupportTraceRepository()
        repo.upsert(base)
        with self.assertRaises(SupportTraceConcurrencyError):
            repo.upsert({**base, "last_event": "stale"}, expected_trace_version=99)

    def test_service_retries_on_concurrency_conflict(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        from support_trace.services.support_trace_service import SupportTraceService

        result = SupportTraceService.record(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(uuid.uuid4()),
            organization_id=str(clinic.id),
            status=TraceStatus.RUNNING,
            last_event="first",
            correlation_id=corr_id,
        )
        self.assertTrue(result.success)
        result2 = SupportTraceService.record(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=str(uuid.uuid4()),
            organization_id=str(clinic.id),
            status=TraceStatus.RUNNING,
            last_event="second",
            correlation_id=corr_id,
        )
        self.assertTrue(result2.success)
        self.assertEqual(result2.trace_version, 2)
