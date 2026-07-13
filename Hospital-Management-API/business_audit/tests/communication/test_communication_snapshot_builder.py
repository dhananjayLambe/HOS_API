"""Unit tests for communication snapshot builder."""

from __future__ import annotations

from django.test import TestCase

from business_audit.communication.snapshot_builder import (
    build_channel_selection_snapshot,
    build_communication_decision_snapshot,
    build_delivery_metrics,
    build_provider_response_snapshot,
    hash_payload,
)


class CommunicationSnapshotBuilderTests(TestCase):
    def test_hash_payload_stable(self) -> None:
        h1 = hash_payload({"a": 1, "b": 2})
        h2 = hash_payload({"b": 2, "a": 1})
        self.assertEqual(h1, h2)
        self.assertTrue(h1.startswith("sha256:"))

    def test_decision_snapshot_fields(self) -> None:
        snap = build_communication_decision_snapshot(
            communication_attempt_id="att-1",
            communication_id="comm-1",
            attempt_number=1,
            selected_channel="WHATSAPP",
            provider="INTERNAL",
        )
        self.assertEqual(snap["selected_channel"], "WHATSAPP")
        self.assertIn("WHATSAPP", snap["available_channels"])
        self.assertEqual(snap["communication_strategy"], "PRIMARY")

    def test_provider_response_snapshot_hashes(self) -> None:
        snap = build_provider_response_snapshot(
            provider="META",
            provider_reference="wamid.123",
            request_payload={"to": "+91"},
            response_payload={"status": "accepted"},
            latency_ms=120,
        )
        self.assertIsNotNone(snap["request_payload_hash"])
        self.assertIsNotNone(snap["response_payload_hash"])
        self.assertEqual(snap["latency_ms"], 120)

    def test_channel_selection_snapshot(self) -> None:
        snap = build_channel_selection_snapshot(
            selected_channel="EMAIL",
            previous_channel="WHATSAPP",
            previous_error="timeout",
            communication_strategy="FALLBACK",
        )
        self.assertEqual(snap["selected_channel"], "EMAIL")
        self.assertEqual(snap["previous_channel"], "WHATSAPP")
        self.assertEqual(snap["communication_strategy"], "FALLBACK")

    def test_delivery_metrics(self) -> None:
        metrics = build_delivery_metrics(
            queue_wait_ms=50,
            provider_latency_ms=200,
            total_delivery_ms=250,
        )
        self.assertEqual(metrics["queue_wait_ms"], 50)
        self.assertEqual(metrics["total_delivery_ms"], 250)
