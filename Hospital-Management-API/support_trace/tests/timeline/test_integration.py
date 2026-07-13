"""TimelineService integration tests."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.services.business_audit_service import BusinessAuditService
from clinical_audit.enums import AuditAction, AuditOutcome, AuditSource, ClinicalEntity
from clinical_audit.services.clinical_audit_service import ClinicalAuditService
from support_trace.tests.support import setup_trace_context
from support_trace.timeline import TimelineService


class TimelineIntegrationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_build_correlation_timeline_mixed_audits(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        with self.captureOnCommitCallbacks(execute=True):
            ClinicalAuditService.record(
                action=AuditAction.CONSULTATION_STARTED,
                event="Consultation started",
                module="consultations_core",
                resource_type=ClinicalEntity.CONSULTATION,
                resource_id=str(uuid.uuid4()),
                outcome=AuditOutcome.SUCCESS,
                source=AuditSource.DOCTOR,
                user_id="doctor-test",
                organization_id=str(clinic.id),
                correlation_id=corr_id,
                consultation_id=str(uuid.uuid4()),
                validate_references=False,
            )
            BusinessAuditService.record(
                action=BusinessAuditAction.BOOKING_CREATED,
                event="Booking created",
                workflow_type=WorkflowType.BOOKING,
                workflow_instance_id=wf_id,
                category=EventCategory.BOOKING,
                domain="diagnostics",
                service="OrderService",
                operation="create",
                resource_type=BusinessResourceType.BOOKING,
                resource_id="ORD-TL-1",
                organization_id=str(clinic.id),
                status=WorkflowStatus.STARTED,
                outcome=WorkflowOutcome.SUCCESS,
                actor_type=ActorType.SYSTEM,
                correlation_id=corr_id,
                validate_references=False,
            )

        result = TimelineService.build_correlation_timeline(corr_id)
        self.assertGreaterEqual(len(result.events), 2)
        self.assertGreaterEqual(result.statistics.clinical_events, 1)
        self.assertGreaterEqual(result.statistics.business_events, 1)
        self.assertGreater(result.build_duration_ms, 0.0)
        self.assertTrue(result.events[0].timeline_sequence < result.events[-1].timeline_sequence)

    def test_build_workflow_timeline_has_snapshots(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        with self.captureOnCommitCallbacks(execute=True):
            BusinessAuditService.record(
                action=BusinessAuditAction.BOOKING_CREATED,
                event="Booking created",
                workflow_type=WorkflowType.BOOKING,
                workflow_instance_id=wf_id,
                category=EventCategory.BOOKING,
                domain="diagnostics",
                service="OrderService",
                operation="create",
                resource_type=BusinessResourceType.BOOKING,
                resource_id="ORD-TL-2",
                organization_id=str(clinic.id),
                status=WorkflowStatus.STARTED,
                outcome=WorkflowOutcome.SUCCESS,
                actor_type=ActorType.SYSTEM,
                correlation_id=corr_id,
                validate_references=False,
            )

        result = TimelineService.build_workflow_timeline(wf_id)
        self.assertGreaterEqual(len(result.events), 1)
        self.assertGreaterEqual(len(result.workflow_snapshots), 1)
