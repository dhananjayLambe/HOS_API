"""Integration tests for recommendation business audit workflow."""

from __future__ import annotations

from django.test import TestCase

from business_audit.enums import BusinessAuditAction, WorkflowStatus
from business_audit.models import BusinessAudit
from business_audit.recommendation.recommendation_audit_service import (
    RecommendationAuditService,
)
from business_audit.recommendation.repository import RecommendationAuditRepository
from business_audit.tests.recommendation.support import (
    sample_result,
    setup_recommendation_context,
    whatsapp_message_stub,
)
from shared.logging.context import get_context_manager


class RecommendationWorkflowIntegrationTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_generated_to_sent_to_delivered_timeline(self) -> None:
        _, consultation, user, _, recommendation_id, correlation_id = (
            setup_recommendation_context()
        )
        message = whatsapp_message_stub(
            recommendation_id=recommendation_id,
            consultation_id=str(consultation.id),
        )

        RecommendationAuditService.emit_generated(
            consultation,
            recommendation_id,
            sample_result(),
            user=user,
            correlation_id=correlation_id,
        )
        RecommendationAuditService.emit_queued(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            correlation_id=correlation_id,
        )
        RecommendationAuditService.emit_sent(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            meta_message_id="wamid.flow",
            correlation_id=correlation_id,
        )
        RecommendationAuditService.emit_delivered(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            meta_message_id="wamid.flow",
            correlation_id=correlation_id,
        )

        rows = RecommendationAuditRepository().get_by_workflow(recommendation_id)
        self.assertEqual(len(rows), 4)
        self.assertEqual(rows[0].action, BusinessAuditAction.RECOMMENDATION_GENERATED)
        self.assertEqual(rows[-1].action, BusinessAuditAction.RECOMMENDATION_DELIVERED)
        self.assertTrue(all(r.correlation_id == correlation_id for r in rows))
        self.assertTrue(all(r.workflow_instance_id == recommendation_id for r in rows))

    def test_failure_retry_delivered_path(self) -> None:
        _, consultation, user, _, recommendation_id, correlation_id = (
            setup_recommendation_context()
        )
        message = whatsapp_message_stub(
            recommendation_id=recommendation_id,
            consultation_id=str(consultation.id),
        )

        RecommendationAuditService.emit_generated(
            consultation, recommendation_id, sample_result(), user=user
        )
        RecommendationAuditService.emit_failed(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            failure_reason="Meta rejected",
            provider_response_code="131000",
            prior_status="Queued",
            meta_message_id="wamid.fail",
        )
        RecommendationAuditService.emit_retried(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            retry_count=1,
            retry_reason="Meta rejected",
            prior_status="Failed",
            prior_retry_count=0,
        )
        RecommendationAuditService.emit_delivered(
            consultation=consultation,
            recommendation_id=recommendation_id,
            whatsapp_message=message,
            meta_message_id="wamid.flow",
        )

        rows = RecommendationAuditRepository().get_by_workflow(recommendation_id)
        actions = [row.action for row in rows]
        self.assertIn(BusinessAuditAction.RECOMMENDATION_FAILED, actions)
        self.assertIn(BusinessAuditAction.RECOMMENDATION_RETRIED, actions)
        self.assertIn(BusinessAuditAction.RECOMMENDATION_DELIVERED, actions)

    def test_expiration_emits_once(self) -> None:
        _, consultation, user, _, recommendation_id, _ = setup_recommendation_context()
        RecommendationAuditService.emit_generated(
            consultation, recommendation_id, sample_result(), user=user
        )
        first = RecommendationAuditService.emit_expired(
            consultation=consultation,
            recommendation_id=recommendation_id,
            expires_at="2026-07-13T09:00:00+00:00",
        )
        second = RecommendationAuditService.emit_expired(
            consultation=consultation,
            recommendation_id=recommendation_id,
            expires_at="2026-07-13T09:00:00+00:00",
        )
        self.assertTrue(first.success)
        self.assertIsNone(second)
        expired = BusinessAudit.objects.filter(
            action=BusinessAuditAction.RECOMMENDATION_EXPIRED,
            workflow_instance_id=recommendation_id,
        )
        self.assertEqual(expired.count(), 1)
        self.assertEqual(expired.first().status, WorkflowStatus.COMPLETED)
