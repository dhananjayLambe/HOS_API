"""Tests for workflow hierarchy and depth."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import WorkflowType
from support_trace.domain.workflow_relationships import resolve_workflow_depth
from support_trace.tests.support import record_trace_event, setup_trace_context


class WorkflowHierarchyTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_depth_for_workflow_types(self) -> None:
        self.assertEqual(resolve_workflow_depth(WorkflowType.RECOMMENDATION), 0)
        self.assertEqual(resolve_workflow_depth(WorkflowType.BOOKING), 1)
        self.assertEqual(resolve_workflow_depth(WorkflowType.ROUTING), 2)
        self.assertEqual(resolve_workflow_depth(WorkflowType.REPORT_DELIVERY), 3)

    def test_parent_child_persisted(self) -> None:
        clinic, corr_id, parent_id = setup_trace_context()
        child_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            child_id,
            correlation_id=corr_id,
            parent_workflow_instance_id=parent_id,
            workflow_depth=2,
        )
        from support_trace.models import SupportTrace

        trace = SupportTrace.objects.get(workflow_instance_id=child_id)
        self.assertEqual(trace.parent_workflow_instance_id, parent_id)
        self.assertEqual(trace.workflow_depth, 2)
