"""Service-layer tests for labs.services.workflow_transitions."""

from __future__ import annotations

from django.test import TestCase

from labs.choices.workflow import LabAssignmentStatus
from labs.models import LabCollectionRequest, LabVisitAppointment
from labs.services.workflow_transitions import (
    AssignmentNotFoundError,
    RejectReasonRequiredError,
    WorkflowTransitionError,
    accept_assignment,
    can_accept,
    can_reject,
    get_assignment_for_lab_user,
    reject_assignment,
)
from labs.tests.support.workflow_factories import (
    home_assignment,
    lab_admin_client,
    lab_mode_assignment,
    other_branch,
)


class WorkflowTransitionsServiceTests(TestCase):
    def setUp(self):
        _client, self.lab_user, self.branch, self.org = lab_admin_client()

    def test_can_accept_and_reject_only_when_pending(self):
        assignment, _ = home_assignment(self.branch)
        self.assertTrue(can_accept(assignment))
        self.assertTrue(can_reject(assignment))
        assignment.status = LabAssignmentStatus.ACCEPTED
        self.assertFalse(can_accept(assignment))
        self.assertFalse(can_reject(assignment))

    def test_accept_assignment_sets_accepted_timestamp(self):
        assignment, _ = home_assignment(self.branch)
        result = accept_assignment(assignment.id, self.lab_user)
        result.refresh_from_db()
        self.assertEqual(result.status, LabAssignmentStatus.ACCEPTED)
        self.assertIsNotNone(result.accepted_at)

    def test_reject_assignment_sets_rejected_fields(self):
        assignment, _ = home_assignment(self.branch)
        result = reject_assignment(assignment.id, self.lab_user, reason="Capacity full")
        result.refresh_from_db()
        self.assertEqual(result.status, LabAssignmentStatus.REJECTED)
        self.assertIsNotNone(result.rejected_at)
        self.assertEqual(result.rejection_reason, "Capacity full")

    def test_reject_empty_reason_raises(self):
        assignment, _ = home_assignment(self.branch)
        with self.assertRaises(RejectReasonRequiredError):
            reject_assignment(assignment.id, self.lab_user, reason="   ")

    def test_accept_home_provisions_collection_request(self):
        assignment, order = home_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        collection = LabCollectionRequest.objects.get(diagnostic_order=order)
        self.assertEqual(collection.collection_type, "HOME")
        self.assertEqual(collection.lab_branch_id, self.branch.id)

    def test_accept_lab_provisions_visit_not_collection(self):
        assignment, order = lab_mode_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        self.assertFalse(LabCollectionRequest.objects.filter(diagnostic_order=order).exists())
        self.assertTrue(LabVisitAppointment.objects.filter(diagnostic_order=order).exists())

    def test_accept_non_pending_raises_workflow_error(self):
        assignment, _ = home_assignment(self.branch, assignment_status=LabAssignmentStatus.ACCEPTED)
        with self.assertRaises(WorkflowTransitionError):
            accept_assignment(assignment.id, self.lab_user)

    def test_reject_non_pending_raises_workflow_error(self):
        assignment, _ = home_assignment(self.branch, assignment_status=LabAssignmentStatus.ACCEPTED)
        with self.assertRaises(WorkflowTransitionError):
            reject_assignment(assignment.id, self.lab_user, reason="Too late")

    def test_get_assignment_wrong_branch_raises_not_found(self):
        assignment, _ = home_assignment(other_branch(self.org))
        with self.assertRaises(AssignmentNotFoundError):
            get_assignment_for_lab_user(assignment.id, self.lab_user)

    def test_accept_wrong_branch_raises_not_found(self):
        assignment, _ = home_assignment(other_branch(self.org))
        with self.assertRaises(AssignmentNotFoundError):
            accept_assignment(assignment.id, self.lab_user)

    def test_reject_wrong_branch_raises_not_found(self):
        assignment, _ = home_assignment(other_branch(self.org))
        with self.assertRaises(AssignmentNotFoundError):
            reject_assignment(assignment.id, self.lab_user, reason="Nope")

    def test_double_accept_second_raises(self):
        assignment, _ = home_assignment(self.branch)
        accept_assignment(assignment.id, self.lab_user)
        with self.assertRaises(WorkflowTransitionError):
            accept_assignment(assignment.id, self.lab_user)
