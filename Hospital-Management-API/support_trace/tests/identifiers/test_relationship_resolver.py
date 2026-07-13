"""Tests for RelationshipResolver."""

from __future__ import annotations

import uuid

from django.test import TestCase

from support_trace.identifiers.relationship_resolver import RelationshipResolver
from support_trace.models import SupportTrace
from support_trace.tests.support import record_trace_event, setup_trace_context


class RelationshipResolverTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_expand_finds_correlation_siblings(self) -> None:
        clinic, corr_id, parent_id = setup_trace_context()
        child_id = str(uuid.uuid4())
        record_trace_event(clinic, parent_id, correlation_id=corr_id)
        record_trace_event(
            clinic,
            child_id,
            correlation_id=corr_id,
            parent_workflow_instance_id=parent_id,
        )
        parent_trace = SupportTrace.objects.get(workflow_instance_id=parent_id)
        related = RelationshipResolver.expand([parent_trace])
        child_ids = {t.workflow_instance_id for t in related}
        self.assertIn(child_id, child_ids)

    def test_collect_identifiers(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        booking_id = str(uuid.uuid4())
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            identifiers={"booking_id": booking_id},
        )
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        ids = RelationshipResolver.collect_identifiers(trace)
        self.assertEqual(ids["booking_id"], booking_id.lower())
