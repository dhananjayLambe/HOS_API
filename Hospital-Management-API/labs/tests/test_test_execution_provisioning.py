"""Unit tests for test_execution_provisioning."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.test import TestCase

from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderTestLine,
    DiagnosticServiceMaster,
)
from diagnostics_engine.models.choices import OrderLineType, OrderStatus
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _lab_org_and_branch,
)
from labs.choices.workflow import LabAssignmentStatus, TestExecutionStatus, TestExecutionType
from labs.models import LabCollectionRequest, LabOrderAssignment, LabOrderTestExecution, LabVisitAppointment
from labs.services.collection_request_provisioning import ProvisioningError, ensure_lab_collection_request
from labs.services.test_execution_provisioning import ensure_test_executions


def _accepted_assignment(*, mode: str = "home"):
    from clinic.models import Clinic

    _, branch = _lab_org_and_branch()
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    doc_user, doc_profile = _doctor_user_and_profile(clinic)
    consultation, encounter, profile, _, _, _ = _consultation_with_investigations(
        doc_user,
        doc_profile,
        with_catalog=False,
    )
    cat = DiagnosticCategory.objects.create(
        name=f"Cat {uuid.uuid4().hex[:6]}",
        code=f"C-{uuid.uuid4().hex[:6]}",
    )
    svc = DiagnosticServiceMaster.objects.create(
        code=f"svc_{uuid.uuid4().hex[:6]}",
        name="CBC",
        category=cat,
    )
    order = DiagnosticOrder.objects.create(
        order_number=f"ORD-{uuid.uuid4().hex[:6].upper()}",
        encounter=encounter,
        consultation=consultation,
        patient_profile=profile,
        doctor=doc_profile,
        branch=branch,
        sample_collection_mode=mode,
        status=OrderStatus.CREATED,
    )
    oi = DiagnosticOrderItem.objects.create(
        order=order,
        line_type=OrderLineType.TEST,
        service=svc,
        name_snapshot=svc.name,
        price_snapshot=Decimal("50.00"),
        metadata_snapshot={},
    )
    DiagnosticOrderTestLine.objects.create(order=order, order_item=oi, service=svc)
    assignment = LabOrderAssignment.objects.create(
        diagnostic_order=order,
        lab_branch=branch,
        status=LabAssignmentStatus.ACCEPTED,
    )
    return assignment, order, branch


class TestExecutionProvisioningTests(TestCase):
    def test_requires_accepted_assignment(self):
        assignment, order, branch = _accepted_assignment()
        assignment.status = LabAssignmentStatus.PENDING
        assignment.save(update_fields=["status"])
        collection, _ = ensure_lab_collection_request(assignment=assignment)
        with self.assertRaises(ProvisioningError):
            ensure_test_executions(assignment=assignment, collection_request=collection)

    def test_xor_workflow_links(self):
        assignment, order, branch = _accepted_assignment()
        collection, _ = ensure_lab_collection_request(assignment=assignment)
        with self.assertRaises(ProvisioningError):
            ensure_test_executions(assignment=assignment)
        visit = LabVisitAppointment.objects.create(
            diagnostic_order=order,
            lab_branch=branch,
            appointment_date=order.created_at.date(),
            appointment_slot="10:00",
        )
        with self.assertRaises(ProvisioningError):
            ensure_test_executions(
                assignment=assignment,
                collection_request=collection,
                visit_appointment=visit,
            )

    def test_home_collection_provisions_per_test_line(self):
        assignment, order, _ = _accepted_assignment()
        collection, _ = ensure_lab_collection_request(assignment=assignment)
        created = ensure_test_executions(
            assignment=assignment,
            collection_request=collection,
        )
        self.assertEqual(len(created), order.test_lines.count())
        row = created[0]
        self.assertEqual(row.execution_type, TestExecutionType.HOME_COLLECTION)
        self.assertEqual(row.metadata.get("execution_source"), "home_collection")
        self.assertIn("provisioned_at", row.metadata)

    def test_idempotent_active_row(self):
        assignment, order, _ = _accepted_assignment()
        collection, _ = ensure_lab_collection_request(assignment=assignment)
        first = ensure_test_executions(
            assignment=assignment,
            collection_request=collection,
        )
        second = ensure_test_executions(
            assignment=assignment,
            collection_request=collection,
        )
        self.assertEqual(len(first), order.test_lines.count())
        self.assertEqual(len(second), 0)

    def test_completed_then_new_pending_allowed(self):
        assignment, order, branch = _accepted_assignment()
        collection, _ = ensure_lab_collection_request(assignment=assignment)
        ensure_test_executions(assignment=assignment, collection_request=collection)
        LabOrderTestExecution.objects.filter(assignment=assignment).update(
            execution_status=TestExecutionStatus.COMPLETED,
        )
        created = ensure_test_executions(
            assignment=assignment,
            collection_request=collection,
        )
        self.assertEqual(len(created), order.test_lines.count())
