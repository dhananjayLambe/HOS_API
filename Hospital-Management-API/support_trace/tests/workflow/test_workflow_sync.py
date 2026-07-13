"""WorkflowStateService and sync path tests."""

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
from clinical_audit.enums import AuditAction, AuditOutcome, AuditSource, ClinicalEntity
from clinical_audit.services.clinical_audit_service import ClinicalAuditService
from business_audit.services.business_audit_service import BusinessAuditService
from support_trace.domain.repository import SupportTraceRepository
from support_trace.domain.sync_event import SupportTraceSyncEvent
from support_trace.enums import TraceSource, TraceStatus
from support_trace.models import SupportTrace
from support_trace.services.projection_engine import ProjectionEngine
from support_trace.tests.support import setup_trace_context
from support_trace.workflow.registries import resolve_transition
from support_trace.workflow.resolvers import WorkflowResolver
from support_trace.workflow.types import ResolvedWorkflow
from support_trace.workflow.workflow_state_service import WorkflowStateService
from support_trace.workflow.workflow_sync_service import WorkflowSyncService


class WorkflowStateServiceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_update_sets_state_and_snapshot(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        transition = resolve_transition(
            "booking.confirmed", workflow_type=WorkflowType.BOOKING
        )
        assert transition is not None
        resolved = ResolvedWorkflow(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id="ORD-1",
            organization_id=str(clinic.id),
            action="booking.confirmed",
            last_event="booking.confirmed",
            correlation_id=corr_id,
            identifiers={"booking_id": "ORD-1"},
        )
        result = WorkflowStateService.update_workflow_state(
            resolved=resolved,
            transition=transition,
            last_source=TraceSource.BUSINESS_AUDIT,
        )
        self.assertTrue(result.success)
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        self.assertEqual(trace.current_state, "Confirmed")
        self.assertEqual(trace.current_snapshot.get("booking_status"), "CONFIRMED")

    def test_retry_increments(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        for action in ("recommendation.generated", "recommendation.failed"):
            transition = resolve_transition(
                action, workflow_type=WorkflowType.RECOMMENDATION
            )
            assert transition is not None
            resolved = ResolvedWorkflow(
                workflow_instance_id=wf_id,
                workflow_type=WorkflowType.RECOMMENDATION,
                resource_type=BusinessResourceType.RECOMMENDATION,
                resource_id="REC-1",
                organization_id=str(clinic.id),
                action=action,
                last_event=action,
                correlation_id=corr_id,
            )
            WorkflowStateService.update_workflow_state(
                resolved=resolved,
                transition=transition,
                last_source=TraceSource.BUSINESS_AUDIT,
            )
        transition = resolve_transition(
            "recommendation.retried", workflow_type=WorkflowType.RECOMMENDATION
        )
        assert transition is not None
        resolved = ResolvedWorkflow(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.RECOMMENDATION,
            resource_type=BusinessResourceType.RECOMMENDATION,
            resource_id="REC-1",
            organization_id=str(clinic.id),
            action="recommendation.retried",
            last_event="recommendation.retried",
            correlation_id=corr_id,
            payload={"retry_reason": "provider_timeout"},
        )
        WorkflowStateService.update_workflow_state(
            resolved=resolved,
            transition=transition,
            last_source=TraceSource.BUSINESS_AUDIT,
        )
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        self.assertEqual(trace.retry_count, 1)
        self.assertEqual(trace.current_snapshot.get("retry_reason"), "provider_timeout")


class SyncEventFactoryTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_serializable_roundtrip(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        event = SupportTraceSyncEvent(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id="ORD-1",
            organization_id=str(clinic.id),
            last_event="booking.created",
            last_sequence_no=1,
            source=TraceSource.BUSINESS_AUDIT,
            audit_id=str(uuid.uuid4()),
            status=TraceStatus.STARTED,
            action="booking.created",
            correlation_id=corr_id,
            payload={"booking_status": "CREATED"},
        )
        data = event.to_serializable()
        restored = SupportTraceSyncEvent.from_serializable(data)
        self.assertEqual(restored.workflow_instance_id, event.workflow_instance_id)
        self.assertEqual(restored.action, "booking.created")
        self.assertEqual(restored.source, TraceSource.BUSINESS_AUDIT)


class WorkflowSyncServiceTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_sync_creates_trace(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        event = SupportTraceSyncEvent(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id="ORD-2",
            organization_id=str(clinic.id),
            last_event="booking.created",
            last_sequence_no=1,
            source=TraceSource.BUSINESS_AUDIT,
            audit_id=str(uuid.uuid4()),
            status=TraceStatus.STARTED,
            action="booking.created",
            correlation_id=corr_id,
            identifiers={"booking_id": "ORD-2"},
        )
        result = WorkflowSyncService.sync(event)
        self.assertTrue(result.success)
        self.assertTrue(SupportTrace.objects.filter(workflow_instance_id=wf_id).exists())

    def test_unmapped_action_noop(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        event = SupportTraceSyncEvent(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id="ORD-3",
            organization_id=str(clinic.id),
            last_event="authentication.login",
            last_sequence_no=1,
            source=TraceSource.BUSINESS_AUDIT,
            audit_id=str(uuid.uuid4()),
            status=TraceStatus.RUNNING,
            action="authentication.login",
            correlation_id=corr_id,
        )
        result = WorkflowSyncService.sync(event)
        self.assertTrue(result.success)
        self.assertFalse(SupportTrace.objects.filter(workflow_instance_id=wf_id).exists())


class BulkUpsertTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_bulk_upsert_stub(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        from support_trace.domain.fingerprint import compute_workflow_fingerprint

        fp = compute_workflow_fingerprint(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_id="ORD-B",
            organization_id=str(clinic.id),
        )
        repo = SupportTraceRepository()
        traces = repo.bulk_upsert(
            [
                {
                    "workflow_instance_id": wf_id,
                    "workflow_type": WorkflowType.BOOKING,
                    "resource_type": BusinessResourceType.BOOKING,
                    "resource_id": "ORD-B",
                    "organization_id": str(clinic.id),
                    "correlation_id": corr_id,
                    "status": TraceStatus.STARTED,
                    "last_event": "booking.created",
                    "workflow_fingerprint": fp,
                    "last_source": TraceSource.SYSTEM,
                    "sync_status": "Indexed",
                    "workflow_health": "Healthy",
                    "current_state": "Created",
                }
            ]
        )
        self.assertEqual(len(traces), 1)


class AuditHookIntegrationTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_business_audit_projects_trace(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        with self.captureOnCommitCallbacks(execute=True):
            result = BusinessAuditService.record(
                action=BusinessAuditAction.BOOKING_CREATED,
                event="Booking created",
                workflow_type=WorkflowType.BOOKING,
                workflow_instance_id=wf_id,
                category=EventCategory.BOOKING,
                domain="diagnostics",
                service="OrderService",
                operation="create",
                resource_type=BusinessResourceType.BOOKING,
                resource_id="ORD-HOOK-1",
                organization_id=str(clinic.id),
                status=WorkflowStatus.STARTED,
                outcome=WorkflowOutcome.SUCCESS,
                actor_type=ActorType.SYSTEM,
                correlation_id=corr_id,
                validate_references=False,
            )
        self.assertTrue(result.success)
        self.assertTrue(
            SupportTrace.objects.filter(workflow_instance_id=wf_id).exists()
        )
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        self.assertEqual(trace.current_state, "Created")
        self.assertEqual(str(trace.last_business_audit_id), str(result.audit_id))

    def test_clinical_audit_projects_trace(self) -> None:
        clinic, corr_id, _ = setup_trace_context()
        consultation_id = str(uuid.uuid4())
        with self.captureOnCommitCallbacks(execute=True):
            result = ClinicalAuditService.record(
                action=AuditAction.CONSULTATION_STARTED,
                event="Consultation started",
                resource_type=ClinicalEntity.CONSULTATION,
                resource_id=consultation_id,
                source=AuditSource.DOCTOR,
                user_id=str(uuid.uuid4()),
                organization_id=str(clinic.id),
                consultation_id=consultation_id,
                correlation_id=corr_id,
                outcome=AuditOutcome.SUCCESS,
                validate_references=False,
            )
        self.assertTrue(result.success)
        wf_id = f"clinical:consultation:{consultation_id}"
        self.assertTrue(SupportTrace.objects.filter(workflow_instance_id=wf_id).exists())
        trace = SupportTrace.objects.get(workflow_instance_id=wf_id)
        self.assertEqual(trace.current_state, "Started")
        self.assertEqual(str(trace.last_clinical_audit_id), str(result.audit_id))


class ProjectionEngineTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def test_engine_delegates_to_sync(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        event = SupportTraceSyncEvent(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id="ORD-PE",
            organization_id=str(clinic.id),
            last_event="booking.created",
            last_sequence_no=1,
            source=TraceSource.BUSINESS_AUDIT,
            audit_id=str(uuid.uuid4()),
            status=TraceStatus.STARTED,
            action="booking.created",
            correlation_id=corr_id,
        )
        result = ProjectionEngine.project(event)
        self.assertTrue(result.success)
