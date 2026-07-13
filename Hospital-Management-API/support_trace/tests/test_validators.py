"""Unit tests for SupportTraceRequestValidator."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.domain.fingerprint import compute_workflow_fingerprint
from support_trace.domain.validators import SupportTraceRequestValidator
from support_trace.enums import SyncStatus, TraceSource, TraceStatus, WorkflowHealth
from support_trace.exceptions import TraceValidationError
from support_trace.tests.support import record_trace_event, setup_trace_context


class SupportTraceValidatorTests(TestCase):
    def tearDown(self) -> None:
        from shared.logging.context import get_context_manager

        get_context_manager().clear()

    def _fingerprint(self, wf_id: str, org_id: str, res_id: str) -> str:
        return compute_workflow_fingerprint(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_id=res_id,
            organization_id=org_id,
        )

    def test_valid_request(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        res_id = str(uuid.uuid4())
        validated = SupportTraceRequestValidator.validate(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id=res_id,
            organization_id=str(clinic.id),
            status=TraceStatus.RUNNING,
            last_event="booking.created",
            correlation_id=corr_id,
            workflow_fingerprint=self._fingerprint(wf_id, str(clinic.id), res_id),
            last_source=TraceSource.SYSTEM,
            sync_status=SyncStatus.PENDING,
            workflow_health=WorkflowHealth.HEALTHY,
        )
        self.assertEqual(validated.workflow_instance_id, wf_id)

    def test_missing_correlation_id_raises(self) -> None:
        clinic, _, wf_id = setup_trace_context()
        with self.assertRaises(TraceValidationError):
            SupportTraceRequestValidator.validate(
                workflow_instance_id=wf_id,
                workflow_type=WorkflowType.BOOKING,
                resource_type=BusinessResourceType.BOOKING,
                resource_id=str(uuid.uuid4()),
                organization_id=str(clinic.id),
                status=TraceStatus.RUNNING,
                last_event="x",
                workflow_fingerprint="sha256:" + "a" * 64,
            )

    def test_parent_equals_self_raises(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        res_id = str(uuid.uuid4())
        with self.assertRaises(TraceValidationError):
            SupportTraceRequestValidator.validate(
                workflow_instance_id=wf_id,
                workflow_type=WorkflowType.BOOKING,
                resource_type=BusinessResourceType.BOOKING,
                resource_id=res_id,
                organization_id=str(clinic.id),
                status=TraceStatus.RUNNING,
                last_event="x",
                correlation_id=corr_id,
                parent_workflow_instance_id=wf_id,
                workflow_fingerprint=self._fingerprint(wf_id, str(clinic.id), res_id),
            )

    def test_sequence_monotonicity_on_update(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            last_sequence_no=2,
        )
        from support_trace.models import SupportTrace

        existing = SupportTrace.objects.get(workflow_instance_id=wf_id)
        with self.assertRaises(TraceValidationError):
            SupportTraceRequestValidator.validate(
                workflow_instance_id=wf_id,
                workflow_type=WorkflowType.BOOKING,
                resource_type=BusinessResourceType.BOOKING,
                resource_id=existing.resource_id,
                organization_id=str(clinic.id),
                status=TraceStatus.RUNNING,
                last_event="x",
                correlation_id=corr_id,
                last_sequence_no=1,
                workflow_fingerprint=existing.workflow_fingerprint,
                existing=existing,
            )

    def test_terminal_state_cannot_regress(self) -> None:
        clinic, corr_id, wf_id = setup_trace_context()
        record_trace_event(
            clinic,
            wf_id,
            correlation_id=corr_id,
            status=TraceStatus.COMPLETED,
            last_event="done",
        )
        from support_trace.models import SupportTrace

        existing = SupportTrace.objects.get(workflow_instance_id=wf_id)
        with self.assertRaises(TraceValidationError):
            SupportTraceRequestValidator.validate(
                workflow_instance_id=wf_id,
                workflow_type=WorkflowType.BOOKING,
                resource_type=BusinessResourceType.BOOKING,
                resource_id=existing.resource_id,
                organization_id=str(clinic.id),
                status=TraceStatus.RUNNING,
                last_event="reopen",
                correlation_id=corr_id,
                workflow_fingerprint=existing.workflow_fingerprint,
                existing=existing,
            )
