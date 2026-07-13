"""Resolver unit tests."""

from __future__ import annotations

import uuid
from types import SimpleNamespace

from django.test import TestCase

from business_audit.enums import BusinessResourceType, WorkflowType
from clinical_audit.enums import AuditAction, ClinicalEntity
from support_trace.workflow.constants import CONSULTATION_WORKFLOW_PREFIX
from support_trace.workflow.resolvers import (
    IdentifierResolver,
    ParentResolver,
    WorkflowResolver,
)


class WorkflowResolverTests(TestCase):
    def test_business_uses_audit_workflow_id(self) -> None:
        wf_id = str(uuid.uuid4())
        audit = SimpleNamespace(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_type=BusinessResourceType.BOOKING,
            resource_id="ORD-1",
            organization_id=str(uuid.uuid4()),
            parent_workflow_instance_id=None,
            action="booking.created",
            event="Booking created",
            correlation_id=str(uuid.uuid4()),
            request_id=None,
            sequence_no=1,
            created_at=None,
            payload={},
        )
        resolved = WorkflowResolver.resolve_from_business_audit(audit)
        self.assertEqual(resolved.workflow_instance_id, wf_id)
        self.assertEqual(resolved.workflow_type, WorkflowType.BOOKING)

    def test_clinical_consultation_deterministic_id(self) -> None:
        consultation_id = str(uuid.uuid4())
        audit = SimpleNamespace(
            action=AuditAction.CONSULTATION_STARTED,
            event="Consultation started",
            resource_type=ClinicalEntity.CONSULTATION,
            resource_id=consultation_id,
            organization_id=str(uuid.uuid4()),
            consultation_id=consultation_id,
            correlation_id=str(uuid.uuid4()),
            payload={},
            new_value={"_meta": {"organization_id": str(uuid.uuid4())}},
            timestamp=None,
            occurred_at=None,
        )
        resolved = WorkflowResolver.resolve_from_clinical_audit(audit)
        self.assertEqual(
            resolved.workflow_instance_id,
            f"{CONSULTATION_WORKFLOW_PREFIX}{consultation_id}",
        )
        self.assertEqual(resolved.workflow_type, WorkflowType.CONSULTATION)

    def test_clinical_prescription_parent(self) -> None:
        consultation_id = str(uuid.uuid4())
        prescription_id = str(uuid.uuid4())
        audit = SimpleNamespace(
            action=AuditAction.PRESCRIPTION_SIGNED,
            event="Prescription signed",
            resource_type=ClinicalEntity.PRESCRIPTION,
            resource_id=prescription_id,
            organization_id=str(uuid.uuid4()),
            consultation_id=consultation_id,
            correlation_id=str(uuid.uuid4()),
            payload={},
            new_value={"_meta": {"organization_id": str(uuid.uuid4())}},
            timestamp=None,
            occurred_at=None,
        )
        resolved = WorkflowResolver.resolve_from_clinical_audit(audit)
        self.assertTrue(resolved.workflow_instance_id.startswith("clinical:prescription:"))
        self.assertEqual(
            resolved.parent_workflow_instance_id,
            f"{CONSULTATION_WORKFLOW_PREFIX}{consultation_id}",
        )


class IdentifierResolverTests(TestCase):
    def test_business_booking_id(self) -> None:
        audit = SimpleNamespace(
            resource_type=BusinessResourceType.BOOKING,
            resource_id="ORD-99",
            workflow_type=WorkflowType.BOOKING,
            payload={"phone_number": "+91 98765 43210"},
            provider_reference="prov-1",
        )
        ids = IdentifierResolver.from_business_audit(audit)
        self.assertEqual(ids["booking_id"], "ORD-99")
        self.assertEqual(ids["phone_number"], "919876543210")
        self.assertEqual(ids["provider_reference"], "prov-1")


class ParentResolverTests(TestCase):
    def test_depth_for_booking(self) -> None:
        parent, depth = ParentResolver.resolve(
            workflow_instance_id=str(uuid.uuid4()),
            workflow_type=WorkflowType.BOOKING,
        )
        self.assertIsNone(parent)
        self.assertEqual(depth, 1)
