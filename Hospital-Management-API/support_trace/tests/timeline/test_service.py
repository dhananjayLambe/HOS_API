"""TimelineService unit tests."""

from __future__ import annotations

from django.test import TestCase

from support_trace.timeline.timeline_resolver import TimelineResolver
from support_trace.timeline.types import TimelineScope


class ServiceTests(TestCase):
    def test_resolver_correlation_scope(self) -> None:
        scope = TimelineResolver.resolve_correlation("corr-123")
        self.assertEqual(scope.scope_type, "correlation")
        self.assertEqual(scope.scope_value, "corr-123")

    def test_resolver_patient_scope(self) -> None:
        scope = TimelineResolver.resolve_patient("patient-1")
        self.assertEqual(scope.scope_type, "patient")
        self.assertEqual(scope.patient_account_id, "patient-1")
