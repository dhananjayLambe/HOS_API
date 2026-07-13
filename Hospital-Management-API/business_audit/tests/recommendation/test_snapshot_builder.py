"""Unit tests for RecommendationSnapshotBuilder."""

from __future__ import annotations

from django.test import TestCase

from business_audit.recommendation.snapshot_builder import RecommendationSnapshotBuilder


class RecommendationSnapshotBuilderTests(TestCase):
    def test_retry_state(self) -> None:
        before, after = RecommendationSnapshotBuilder.retry_state(
            prior_status="Failed",
            prior_retry_count=1,
            provider_response_code="500",
        )
        self.assertIn("Failed", before)
        self.assertEqual(after, "Retrying")

    def test_failed_state(self) -> None:
        before, after = RecommendationSnapshotBuilder.failed_state(prior_status="Queued")
        self.assertEqual(before, "Queued")
        self.assertEqual(after, "Failed")
