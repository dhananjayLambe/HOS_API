"""Database integrity tests for LabOrderTestExecution constraints."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
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
from labs.models import (
    LabBranch,
    LabCollectionRequest,
    LabOrderAssignment,
    LabOrderTestExecution,
)


def _assignment_with_test_line(branch: LabBranch):
    from clinic.models import Clinic

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
        sample_collection_mode="home",
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
    test_line = DiagnosticOrderTestLine.objects.create(
        order=order,
        order_item=oi,
        service=svc,
    )
    assignment = LabOrderAssignment.objects.create(
        diagnostic_order=order,
        lab_branch=branch,
        status=LabAssignmentStatus.ACCEPTED,
    )
    return assignment, test_line, branch


class LabOrderTestExecutionConstraintTests(TestCase):
    def setUp(self):
        _, self.branch = _lab_org_and_branch()

    def _create_execution(self, assignment, test_line, **kwargs):
        order = assignment.diagnostic_order
        execution_type = kwargs.get(
            "execution_type",
            TestExecutionType.HOME_COLLECTION,
        )
        defaults = {
            "assignment": assignment,
            "test_line": test_line,
            "lab_branch": assignment.lab_branch,
            "execution_status": TestExecutionStatus.PENDING,
            "execution_type": execution_type,
        }
        if execution_type == TestExecutionType.HOME_COLLECTION:
            collection, _ = LabCollectionRequest.objects.get_or_create(
                diagnostic_order=order,
                defaults={
                    "lab_branch": assignment.lab_branch,
                    "preferred_date": order.created_at.date(),
                    "preferred_slot": "09:00-10:00",
                },
            )
            defaults["collection_request"] = collection
        defaults.update(kwargs)
        return LabOrderTestExecution.objects.create(**defaults)

    def test_duplicate_active_execution_blocked(self):
        assignment, test_line, _ = _assignment_with_test_line(self.branch)
        self._create_execution(assignment, test_line)
        with self.assertRaises(ValidationError):
            self._create_execution(assignment, test_line)

    def test_duplicate_active_execution_bulk_create_integrity_error(self):
        assignment, test_line, _ = _assignment_with_test_line(self.branch)
        first = self._create_execution(assignment, test_line)
        second = LabOrderTestExecution(
            assignment=assignment,
            test_line=test_line,
            lab_branch=assignment.lab_branch,
            execution_status=TestExecutionStatus.PENDING,
            execution_type=first.execution_type,
            collection_request=first.collection_request,
        )
        with self.assertRaises(IntegrityError):
            LabOrderTestExecution.objects.bulk_create([second])

    def test_completed_then_pending_allowed(self):
        assignment, test_line, _ = _assignment_with_test_line(self.branch)
        self._create_execution(
            assignment,
            test_line,
            execution_status=TestExecutionStatus.COMPLETED,
        )
        row = self._create_execution(assignment, test_line)
        self.assertEqual(row.execution_status, TestExecutionStatus.PENDING)

    def test_duplicate_cancelled_allowed(self):
        assignment, test_line, _ = _assignment_with_test_line(self.branch)
        self._create_execution(
            assignment,
            test_line,
            execution_status=TestExecutionStatus.CANCELLED,
        )
        row = self._create_execution(assignment, test_line)
        self.assertEqual(row.execution_status, TestExecutionStatus.PENDING)

    def test_dual_workflow_link_raises_integrity_error(self):
        from labs.models import LabCollectionRequest, LabVisitAppointment

        assignment, test_line, branch = _assignment_with_test_line(self.branch)
        order = assignment.diagnostic_order
        collection = LabCollectionRequest.objects.create(
            diagnostic_order=order,
            lab_branch=branch,
            preferred_date=order.created_at.date(),
            preferred_slot="09:00-10:00",
        )
        assignment2, _, branch2 = _assignment_with_test_line(self.branch)
        visit_order = assignment2.diagnostic_order
        visit = LabVisitAppointment.objects.create(
            diagnostic_order=visit_order,
            lab_branch=branch2,
            appointment_date=visit_order.created_at.date(),
            appointment_slot="10:00-11:00",
        )
        row = LabOrderTestExecution(
            assignment=assignment,
            test_line=test_line,
            lab_branch=branch,
            collection_request=collection,
            visit_appointment=visit,
        )
        with self.assertRaises(IntegrityError):
            LabOrderTestExecution.objects.bulk_create([row])
