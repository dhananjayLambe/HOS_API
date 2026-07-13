"""Unit tests for per-workflow event registries."""

from __future__ import annotations

from django.test import TestCase

from business_audit.enums import WorkflowType
from support_trace.enums import TraceStatus
from support_trace.workflow.registries import resolve_transition


class RegistryTests(TestCase):
    def test_booking_confirmed(self) -> None:
        t = resolve_transition("booking.confirmed", workflow_type=WorkflowType.BOOKING)
        self.assertIsNotNone(t)
        assert t is not None
        self.assertEqual(t.current_state, "Confirmed")
        self.assertEqual(t.trace_status, TraceStatus.RUNNING)

    def test_recommendation_retry(self) -> None:
        t = resolve_transition(
            "recommendation.retried", workflow_type=WorkflowType.RECOMMENDATION
        )
        assert t is not None
        self.assertTrue(t.increment_retry)
        self.assertEqual(t.current_state, "Retry")

    def test_routing_manual_override_allows_regression(self) -> None:
        t = resolve_transition(
            "routing.manual_override", workflow_type=WorkflowType.ROUTING
        )
        assert t is not None
        self.assertTrue(t.allow_regression)

    def test_report_delivery_finalize(self) -> None:
        t = resolve_transition(
            "report.whatsapp_delivery", workflow_type=WorkflowType.REPORT_DELIVERY
        )
        assert t is not None
        self.assertTrue(t.finalize_duration)
        self.assertEqual(t.snapshot_patch.get("current_channel"), "WhatsApp")

    def test_consultation_documentation(self) -> None:
        t = resolve_transition(
            "diagnosis.added", workflow_type=WorkflowType.CONSULTATION
        )
        assert t is not None
        self.assertEqual(t.current_state, "Documentation")

    def test_prescription_signed(self) -> None:
        t = resolve_transition(
            "prescription.signed", workflow_type=WorkflowType.PRESCRIPTION
        )
        assert t is not None
        self.assertEqual(t.current_state, "Signed")

    def test_diagnostic_report_viewed(self) -> None:
        t = resolve_transition(
            "report.viewed", workflow_type=WorkflowType.DIAGNOSTIC_REPORT
        )
        assert t is not None
        self.assertEqual(t.current_state, "Viewed")

    def test_unmapped_returns_none(self) -> None:
        self.assertIsNone(
            resolve_transition("authentication.login", workflow_type=WorkflowType.BOOKING)
        )
