"""Unit tests for workflow fingerprint."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.enums import WorkflowType
from support_trace.domain.fingerprint import compute_workflow_fingerprint


class WorkflowFingerprintTests(TestCase):
    def test_deterministic_fingerprint(self) -> None:
        wf_id = str(uuid.uuid4())
        org_id = str(uuid.uuid4())
        res_id = str(uuid.uuid4())
        a = compute_workflow_fingerprint(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_id=res_id,
            organization_id=org_id,
        )
        b = compute_workflow_fingerprint(
            workflow_instance_id=wf_id,
            workflow_type=WorkflowType.BOOKING,
            resource_id=res_id,
            organization_id=org_id,
        )
        self.assertEqual(a, b)
        self.assertTrue(a.startswith("sha256:"))

    def test_different_inputs_different_fingerprint(self) -> None:
        org_id = str(uuid.uuid4())
        a = compute_workflow_fingerprint(
            workflow_instance_id=str(uuid.uuid4()),
            workflow_type=WorkflowType.BOOKING,
            resource_id=str(uuid.uuid4()),
            organization_id=org_id,
        )
        b = compute_workflow_fingerprint(
            workflow_instance_id=str(uuid.uuid4()),
            workflow_type=WorkflowType.BOOKING,
            resource_id=str(uuid.uuid4()),
            organization_id=org_id,
        )
        self.assertNotEqual(a, b)
