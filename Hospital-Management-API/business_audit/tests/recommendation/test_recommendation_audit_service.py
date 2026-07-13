"""Unit tests for RecommendationAuditService."""

from __future__ import annotations

from django.test import TestCase

from business_audit.enums import BusinessAuditAction, WorkflowOutcome, WorkflowStatus
from business_audit.models import BusinessAudit
from business_audit.recommendation.constants import SOURCE_PATH_MARKETPLACE_API
from business_audit.recommendation.recommendation_audit_service import (
    RecommendationAuditService,
)
from business_audit.tests.recommendation.support import (
    sample_result,
    setup_recommendation_context,
    whatsapp_message_stub,
)
from shared.logging.context import get_context_manager


class RecommendationAuditServiceTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_emit_generated_success(self) -> None:
        _, consultation, user, _, recommendation_id, _ = setup_recommendation_context()
        result = RecommendationAuditService.emit_generated(
            consultation,
            recommendation_id,
            sample_result(),
            user=user,
            source_path=SOURCE_PATH_MARKETPLACE_API,
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.RECOMMENDATION_GENERATED)
        self.assertEqual(audit.workflow_instance_id, recommendation_id)
        self.assertEqual(audit.outcome, WorkflowOutcome.SUCCESS)

    def test_emit_generated_idempotent(self) -> None:
        _, consultation, user, _, recommendation_id, _ = setup_recommendation_context()
        first = RecommendationAuditService.emit_generated(
            consultation,
            recommendation_id,
            sample_result(),
            user=user,
        )
        second = RecommendationAuditService.emit_generated(
            consultation,
            recommendation_id,
            sample_result(),
            user=user,
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_generated_unavailable_outcome(self) -> None:
        _, consultation, user, _, recommendation_id, _ = setup_recommendation_context()
        result = RecommendationAuditService.emit_generated(
            consultation,
            recommendation_id,
            sample_result(available=False),
            user=user,
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.status, WorkflowStatus.FAILED)
        self.assertEqual(audit.outcome, WorkflowOutcome.FAILURE)

    def test_emit_sent_and_idempotent(self) -> None:
        _, consultation, _, _, recommendation_id, _ = setup_recommendation_context()
        message = whatsapp_message_stub(
            recommendation_id=recommendation_id,
            consultation_id=str(consultation.id),
        )
        first = RecommendationAuditService.emit_sent(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            meta_message_id="wamid.unique",
        )
        second = RecommendationAuditService.emit_sent(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            meta_message_id="wamid.unique",
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)

    def test_emit_retried_tracks_retry_count(self) -> None:
        _, consultation, _, _, recommendation_id, _ = setup_recommendation_context()
        message = whatsapp_message_stub(
            recommendation_id=recommendation_id,
            consultation_id=str(consultation.id),
        )
        result = RecommendationAuditService.emit_retried(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            retry_count=2,
            retry_reason="timeout",
            prior_status="Failed",
            prior_retry_count=1,
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.action, BusinessAuditAction.RECOMMENDATION_RETRIED)
        self.assertEqual(audit.retry_count, 2)

    def test_status_completed_with_failure_outcome_on_expired(self) -> None:
        _, consultation, _, _, recommendation_id, _ = setup_recommendation_context()
        result = RecommendationAuditService.emit_expired(
            consultation=consultation,
            recommendation_id=recommendation_id,
            expires_at="2026-07-13T10:00:00+00:00",
        )
        self.assertTrue(result.success)
        audit = BusinessAudit.objects.get(pk=result.audit_id)
        self.assertEqual(audit.status, WorkflowStatus.COMPLETED)
        self.assertEqual(audit.outcome, WorkflowOutcome.FAILURE)
