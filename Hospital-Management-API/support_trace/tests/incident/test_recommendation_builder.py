"""Recommendation builder tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.incident.recommendation_builder import RecommendationBuilder
from support_trace.incident.types import FailureAnalysis, RetryAnalysis
from support_trace.lookup.types import HealthAssessment, TraceLookupResult


class RecommendationBuilderTests(SimpleTestCase):
    def test_whatsapp_retry_recommendation(self) -> None:
        failure = FailureAnalysis(
            failure_stage="WhatsAppDelivery",
            failure_type="Provider",
            failure_reason="Meta timeout",
        )
        retry = RetryAnalysis(total_retries=2, by_workflow={"WhatsAppDelivery": 2})
        lookup = TraceLookupResult()
        recs = RecommendationBuilder.build(lookup, failure=failure, retry=retry)
        actions = [r.action for r in recs]
        self.assertTrue(any("WhatsApp" in a for a in actions))

    def test_routing_recommendation(self) -> None:
        failure = FailureAnalysis(
            failure_stage="Routing",
            failure_type="Infrastructure",
            failure_reason="timeout",
        )
        lookup = TraceLookupResult()
        recs = RecommendationBuilder.build(lookup, failure=failure)
        actions = [r.action for r in recs]
        self.assertTrue(any("Routing" in a or "Laboratory" in a for a in actions))

    def test_no_duplicate_recommendations(self) -> None:
        failure = FailureAnalysis(failure_stage="Routing", failure_type="Infrastructure")
        lookup = TraceLookupResult()
        recs = RecommendationBuilder.build(lookup, failure=failure)
        actions = [r.action for r in recs]
        self.assertEqual(len(actions), len(set(actions)))

    def test_health_based_recommendation(self) -> None:
        lookup = TraceLookupResult(
            health=HealthAssessment(
                overall="AttentionRequired",
                workflow="AttentionRequired",
                communication="Healthy",
                infrastructure="Healthy",
                provider="Healthy",
                aggregate="AttentionRequired",
            )
        )
        recs = RecommendationBuilder.build(lookup)
        self.assertGreater(len(recs), 0)

    def test_report_availability_recommendation(self) -> None:
        failure = FailureAnalysis(failure_stage="ReportDelivery", failure_reason="not found")
        lookup = TraceLookupResult()
        recs = RecommendationBuilder.build(lookup, failure=failure)
        actions = [r.action for r in recs]
        self.assertTrue(any("Report" in a for a in actions))

    def test_recommendations_not_executable(self) -> None:
        failure = FailureAnalysis(failure_stage="Payment", failure_type="Provider")
        lookup = TraceLookupResult()
        recs = RecommendationBuilder.build(lookup, failure=failure)
        for rec in recs:
            self.assertIsInstance(rec.action, str)
            self.assertIsInstance(rec.reason, str)
