"""Unit tests for report communication payload builder."""

from __future__ import annotations

from django.test import TestCase

from business_audit.communication.report.payload_builder import ReportCommunicationPayloadBuilder
from business_audit.tests.communication.support import communication_context_stub


class ReportPayloadBuilderTests(TestCase):
    def test_build_ready_includes_context(self) -> None:
        ctx, org_id = communication_context_stub()
        payload = ReportCommunicationPayloadBuilder.build_ready(ctx)
        self.assertEqual(payload["communication_id"], ctx.communication_id)
        self.assertEqual(payload["communication_type"], "REPORT")
        self.assertEqual(payload["stage"], "ready")

    def test_build_delivery_requested_includes_timings(self) -> None:
        ctx, org_id = communication_context_stub()
        payload = ReportCommunicationPayloadBuilder.build_delivery_requested(
            ctx,
            channel="WHATSAPP",
            queue_wait_ms=100,
        )
        self.assertEqual(payload["selected_channel"], "WHATSAPP")
        self.assertEqual(payload["timings_ms"]["queue_wait_ms"], 100)

    def test_build_channel_delivery_includes_snapshots(self) -> None:
        ctx, org_id = communication_context_stub()
        payload = ReportCommunicationPayloadBuilder.build_channel_delivery(
            ctx,
            channel="WHATSAPP",
            provider="INTERNAL",
            provider_reference="msg-1",
            provider_latency_ms=80,
        )
        self.assertIn("decision_snapshot", payload)
        self.assertIn("provider_response_snapshot", payload)
        self.assertEqual(payload["timings_ms"]["provider_latency_ms"], 80)

    def test_build_delivery_failed_includes_error(self) -> None:
        ctx, org_id = communication_context_stub()
        payload = ReportCommunicationPayloadBuilder.build_delivery_failed(
            ctx,
            channel="WHATSAPP",
            provider="INTERNAL",
            reason="timeout",
            error_classification="provider_timeout",
        )
        self.assertEqual(payload["failure_reason"], "timeout")
        self.assertIn("provider_response_snapshot", payload)

    def test_build_delivery_retried_includes_channel_selection(self) -> None:
        ctx, org_id = communication_context_stub(attempt_number=2)
        payload = ReportCommunicationPayloadBuilder.build_delivery_retried(
            ctx,
            previous_channel="WHATSAPP",
            new_channel="EMAIL",
            previous_error="timeout",
            parent_attempt_id="parent-1",
        )
        self.assertIn("channel_selection_snapshot", payload)
        self.assertEqual(payload["parent_communication_attempt_id"], "parent-1")
