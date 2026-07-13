"""Investigation integration tests."""

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
from support_trace.lookup import TraceLookupService
from support_trace.tests.support import setup_trace_context


class InvestigationIntegrationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_correlation_investigation_full_payload(self) -> None:
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
                resource_id="ORD-INV-1",
                organization_id=str(clinic.id),
                status=WorkflowStatus.STARTED,
                outcome=WorkflowOutcome.SUCCESS,
                actor_type=ActorType.SYSTEM,
                correlation_id=corr_id,
                validate_references=False,
            )

        result = TraceLookupService.lookup_by_correlation(corr_id)
        self.assertIsNotNone(result.timeline)
        self.assertGreaterEqual(len(result.timeline.events), 2)
        self.assertIsNotNone(result.summary)
        self.assertIsNotNone(result.health)
        self.assertIsNotNone(result.statistics)
        self.assertGreater(result.duration_ms, 0)

    def test_lookup_by_booking_via_trace(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        booking_id = str(uuid.uuid4())
        from support_trace.tests.support import record_trace_event

        record_trace_event(
            clinic, wf_id, correlation_id=corr_id, identifiers={"booking_id": booking_id}
        )
        result = TraceLookupService.lookup_by_booking(booking_id)
        self.assertGreaterEqual(result.identifier_lookup.trace_count, 1)
