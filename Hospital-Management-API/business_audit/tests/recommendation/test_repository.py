"""Unit tests for RecommendationAuditRepository."""

from __future__ import annotations

from django.test import TestCase

from business_audit.enums import BusinessAuditAction
from business_audit.recommendation.repository import RecommendationAuditRepository
from business_audit.recommendation.recommendation_audit_service import (
    RecommendationAuditService,
)
from business_audit.tests.recommendation.support import (
    sample_result,
    setup_recommendation_context,
)
from shared.logging.context import get_context_manager


class RecommendationAuditRepositoryTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_get_by_recommendation_and_workflow(self) -> None:
        _, consultation, user, _, recommendation_id, _ = setup_recommendation_context()
        RecommendationAuditService.emit_generated(
            consultation,
            recommendation_id,
            sample_result(),
            user=user,
        )
        repo = RecommendationAuditRepository()
        by_rec = repo.get_by_recommendation(recommendation_id)
        by_wf = repo.get_by_workflow(recommendation_id)
        self.assertEqual(len(by_rec), 1)
        self.assertEqual(len(by_wf), 1)
        self.assertEqual(by_rec[0].action, BusinessAuditAction.RECOMMENDATION_GENERATED)

    def test_get_by_consultation(self) -> None:
        _, consultation, user, _, recommendation_id, _ = setup_recommendation_context()
        RecommendationAuditService.emit_generated(
            consultation,
            recommendation_id,
            sample_result(),
            user=user,
        )
        rows = RecommendationAuditRepository().get_by_consultation(str(consultation.id))
        self.assertEqual(len(rows), 1)
