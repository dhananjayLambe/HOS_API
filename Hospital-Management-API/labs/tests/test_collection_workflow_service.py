"""
Unit tests for labs.services.collection_workflow — transition graph and audit.
"""

from __future__ import annotations

import threading
import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

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
from labs.choices.auth import LabUserRole
from labs.choices.workflow import CollectionStatus
from labs.models import LabBranch, LabCollectionRequest, LabUser
from labs.services.collection_workflow import (
    ALLOWED_TRANSITIONS,
    CollectionNotFoundError,
    CollectionWorkflowError,
    allowed_actions_for_status,
    assign_collection,
    mark_collected,
    mark_failed,
    retry_collection,
    start_collection,
    validate_transition,
)

User = get_user_model()


def _lab_admin_with_branch():
    labadmin_group, _ = Group.objects.get_or_create(name="labadmin")
    user = User.objects.create_user(
        username=f"labadmin_{uuid.uuid4().hex[:8]}",
        password="x",
    )
    user.groups.add(labadmin_group)
    org, branch = _lab_org_and_branch()
    LabUser.objects.create(
        user=user,
        organization=org,
        branch=branch,
        role=LabUserRole.ADMIN,
        employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
    )
    return user, branch


def _collection_pending(branch: LabBranch) -> LabCollectionRequest:
    from clinic.models import Clinic

    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    doc_user, doc_profile = _doctor_user_and_profile(clinic)
    consultation, encounter, profile, _, _, _ = _consultation_with_investigations(
        doc_user,
        doc_profile,
        with_catalog=False,
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
    cat = DiagnosticCategory.objects.create(
        name=f"Cat {uuid.uuid4().hex[:6]}",
        code=f"C-{uuid.uuid4().hex[:6]}",
    )
    svc = DiagnosticServiceMaster.objects.create(
        code=f"svc_{uuid.uuid4().hex[:6]}",
        name="CBC",
        category=cat,
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
    collection = LabCollectionRequest.objects.create(
        diagnostic_order=order,
        lab_branch=branch,
        preferred_date=timezone.now().date(),
        preferred_slot="4-6 PM",
        address_snapshot={},
        collection_status=CollectionStatus.PENDING,
    )
    return collection


def _phlebotomist(branch: LabBranch) -> LabUser:
    return LabUser.objects.create(
        user=User.objects.create_user(username=f"phleb_{uuid.uuid4().hex[:6]}", password="x"),
        organization=branch.organization,
        branch=branch,
        role=LabUserRole.PHLEBOTOMIST,
        employee_code=f"PH-{uuid.uuid4().hex[:4]}",
    )


class CollectionWorkflowServiceTests(TestCase):
    def setUp(self):
        self.admin_user, self.branch = _lab_admin_with_branch()
        self.lab_user = LabUser.objects.get(user=self.admin_user, branch=self.branch)
        self.phleb = _phlebotomist(self.branch)

    def _fresh_collection(self) -> LabCollectionRequest:
        return _collection_pending(self.branch)

    def test_happy_path_assign_start_collect(self):
        collection = self._fresh_collection()
        c = assign_collection(
            collection_id=collection.id,
            lab_user=self.lab_user,
            phlebotomist=self.phleb,
        )
        self.assertEqual(c.collection_status, CollectionStatus.ASSIGNED)
        self.assertIsNotNone(c.assigned_at)

        c = start_collection(collection_id=c.id, lab_user=self.lab_user)
        self.assertEqual(c.collection_status, CollectionStatus.IN_PROGRESS)
        self.assertIsNotNone(c.in_progress_at)

        c = mark_collected(collection_id=c.id, lab_user=self.lab_user)
        self.assertEqual(c.collection_status, CollectionStatus.COLLECTED)
        events = c.metadata.get("workflow_events") or []
        self.assertGreaterEqual(len(events), 3)

    def test_pending_to_collected_raises(self):
        collection = self._fresh_collection()
        with self.assertRaises(CollectionWorkflowError):
            mark_collected(collection_id=collection.id, lab_user=self.lab_user)

    def test_collected_to_failed_raises(self):
        collection = self._fresh_collection()
        c = assign_collection(
            collection_id=collection.id,
            lab_user=self.lab_user,
            phlebotomist=self.phleb,
        )
        c = start_collection(collection_id=c.id, lab_user=self.lab_user)
        c = mark_collected(collection_id=c.id, lab_user=self.lab_user)
        with self.assertRaises(CollectionWorkflowError):
            mark_failed(collection_id=c.id, lab_user=self.lab_user, reason="late fail")

    def test_assign_without_phlebotomist_sets_note_and_assigned_by(self):
        collection = self._fresh_collection()
        c = assign_collection(
            collection_id=collection.id,
            lab_user=self.lab_user,
            assigned_by_user=self.admin_user,
            assignment_note="Assigned to Ramesh",
        )
        self.assertEqual(c.collection_status, CollectionStatus.ASSIGNED)
        self.assertIsNone(c.assigned_phlebotomist_id)
        self.assertEqual(c.assignment_note, "Assigned to Ramesh")
        self.assertEqual(c.assigned_by_id, self.admin_user.id)
        self.assertIsNotNone(c.assigned_at)

    def test_start_without_phlebotomist_succeeds(self):
        collection = self._fresh_collection()
        c = assign_collection(
            collection_id=collection.id,
            lab_user=self.lab_user,
            assigned_by_user=self.admin_user,
        )
        self.assertIsNone(c.assigned_phlebotomist_id)
        c = start_collection(collection_id=c.id, lab_user=self.lab_user)
        self.assertEqual(c.collection_status, CollectionStatus.IN_PROGRESS)

    def test_retry_clears_in_progress_at_and_increments_retry_count(self):
        collection = self._fresh_collection()
        c = assign_collection(
            collection_id=collection.id,
            lab_user=self.lab_user,
            assigned_by_user=self.admin_user,
            assignment_note="Local technician informed",
            phlebotomist=self.phleb,
        )
        c = start_collection(collection_id=c.id, lab_user=self.lab_user)
        self.assertIsNotNone(c.in_progress_at)
        c = mark_failed(collection_id=c.id, lab_user=self.lab_user, reason="no answer")
        c = retry_collection(collection_id=c.id, lab_user=self.lab_user)
        self.assertEqual(c.collection_status, CollectionStatus.PENDING)
        self.assertEqual(c.retry_count, 1)
        self.assertIsNone(c.in_progress_at)
        self.assertIsNone(c.assigned_phlebotomist_id)
        self.assertEqual(c.assignment_note, "")
        self.assertIsNone(c.assigned_by_id)

    def test_wrong_branch_raises_not_found(self):
        collection = self._fresh_collection()
        other_branch = LabBranch.objects.create(
            organization=self.branch.organization,
            branch_name="Other2",
            branch_code=f"BR2-{uuid.uuid4().hex[:6]}",
            is_active=True,
        )
        other_admin = User.objects.create_user(username=f"other_{uuid.uuid4().hex[:6]}", password="x")
        other_lu = LabUser.objects.create(
            user=other_admin,
            organization=self.branch.organization,
            branch=other_branch,
            role=LabUserRole.ADMIN,
            employee_code=f"OA-{uuid.uuid4().hex[:4]}",
        )
        with self.assertRaises(CollectionNotFoundError):
            start_collection(collection_id=collection.id, lab_user=other_lu)

    def test_workflow_events_record_actor(self):
        collection = self._fresh_collection()
        c = assign_collection(
            collection_id=collection.id,
            lab_user=self.lab_user,
            phlebotomist=self.phleb,
        )
        event = (c.metadata.get("workflow_events") or [])[-1]
        self.assertEqual(event["from"], CollectionStatus.PENDING)
        self.assertEqual(event["to"], CollectionStatus.ASSIGNED)
        self.assertEqual(event["actor_id"], str(self.lab_user.id))

    def test_assigned_allowed_actions_include_fail(self):
        self.assertEqual(
            allowed_actions_for_status(CollectionStatus.ASSIGNED),
            ["start", "fail"],
        )

    def test_assigned_to_failed_preserves_assignment_metadata(self):
        collection = self._fresh_collection()
        c = assign_collection(
            collection_id=collection.id,
            lab_user=self.lab_user,
            assigned_by_user=self.admin_user,
            assignment_note="Patient not reachable",
        )
        c = mark_failed(
            collection_id=c.id,
            lab_user=self.lab_user,
            failure_reason="No response",
        )
        self.assertEqual(c.collection_status, CollectionStatus.FAILED)
        self.assertEqual(c.assignment_note, "Patient not reachable")
        self.assertEqual(c.assigned_by_id, self.admin_user.id)
        self.assertIsNotNone(c.assigned_at)
        self.assertEqual(c.metadata.get("failure_reason"), "No response")

    def test_lifecycle_assigned_failed_retry_pending(self):
        collection = self._fresh_collection()
        c = assign_collection(
            collection_id=collection.id,
            lab_user=self.lab_user,
            assigned_by_user=self.admin_user,
            assignment_note="First attempt",
        )
        c = mark_failed(collection_id=c.id, lab_user=self.lab_user, failure_reason="Address issue")
        self.assertEqual(c.collection_status, CollectionStatus.FAILED)
        c = retry_collection(collection_id=c.id, lab_user=self.lab_user)
        self.assertEqual(c.collection_status, CollectionStatus.PENDING)
        self.assertEqual(c.assignment_note, "")

    def test_pending_to_in_progress_raises(self):
        collection = self._fresh_collection()
        with self.assertRaises(CollectionWorkflowError):
            start_collection(collection_id=collection.id, lab_user=self.lab_user)

    def test_retry_while_assigned_raises(self):
        collection = self._fresh_collection()
        c = assign_collection(collection_id=collection.id, lab_user=self.lab_user)
        with self.assertRaises(CollectionWorkflowError):
            retry_collection(collection_id=c.id, lab_user=self.lab_user)

    def test_retry_while_in_progress_raises(self):
        collection = self._fresh_collection()
        c = assign_collection(collection_id=collection.id, lab_user=self.lab_user)
        c = start_collection(collection_id=c.id, lab_user=self.lab_user)
        with self.assertRaises(CollectionWorkflowError):
            retry_collection(collection_id=c.id, lab_user=self.lab_user)

    def test_double_assign_second_raises(self):
        collection = self._fresh_collection()
        assign_collection(collection_id=collection.id, lab_user=self.lab_user)
        with self.assertRaises(CollectionWorkflowError):
            assign_collection(collection_id=collection.id, lab_user=self.lab_user)

    def test_failure_reason_alias_reason(self):
        collection = self._fresh_collection()
        c = assign_collection(collection_id=collection.id, lab_user=self.lab_user)
        c = start_collection(collection_id=c.id, lab_user=self.lab_user)
        c = mark_failed(collection_id=c.id, lab_user=self.lab_user, reason="legacy param")
        self.assertEqual(c.metadata.get("failure_reason"), "legacy param")

    def _other_branch_lab_user(self) -> LabUser:
        other_branch = LabBranch.objects.create(
            organization=self.branch.organization,
            branch_name="Other2",
            branch_code=f"BR2-{uuid.uuid4().hex[:6]}",
            is_active=True,
        )
        other_admin = User.objects.create_user(
            username=f"other_{uuid.uuid4().hex[:6]}",
            password="x",
        )
        return LabUser.objects.create(
            user=other_admin,
            organization=self.branch.organization,
            branch=other_branch,
            role=LabUserRole.ADMIN,
            employee_code=f"OA-{uuid.uuid4().hex[:4]}",
        )

    def test_wrong_branch_assign_raises_not_found(self):
        collection = self._fresh_collection()
        with self.assertRaises(CollectionNotFoundError):
            assign_collection(collection_id=collection.id, lab_user=self._other_branch_lab_user())

    def test_wrong_branch_fail_raises_not_found(self):
        collection = self._fresh_collection()
        c = assign_collection(collection_id=collection.id, lab_user=self.lab_user)
        with self.assertRaises(CollectionNotFoundError):
            mark_failed(collection_id=c.id, lab_user=self._other_branch_lab_user())

    def test_wrong_branch_collect_raises_not_found(self):
        collection = self._fresh_collection()
        c = assign_collection(collection_id=collection.id, lab_user=self.lab_user)
        c = start_collection(collection_id=c.id, lab_user=self.lab_user)
        with self.assertRaises(CollectionNotFoundError):
            mark_collected(collection_id=c.id, lab_user=self._other_branch_lab_user())

    def test_wrong_branch_retry_raises_not_found(self):
        collection = self._fresh_collection()
        c = assign_collection(collection_id=collection.id, lab_user=self.lab_user)
        c = mark_failed(collection_id=c.id, lab_user=self.lab_user)
        with self.assertRaises(CollectionNotFoundError):
            retry_collection(collection_id=c.id, lab_user=self._other_branch_lab_user())


class ValidateTransitionTests(TestCase):
    def test_terminal_states_have_empty_outbound(self):
        self.assertEqual(ALLOWED_TRANSITIONS[CollectionStatus.COLLECTED], set())
        self.assertEqual(ALLOWED_TRANSITIONS[CollectionStatus.CANCELLED], set())

    def test_allowed_transitions(self):
        for current, target in (
            (CollectionStatus.PENDING, CollectionStatus.ASSIGNED),
            (CollectionStatus.ASSIGNED, CollectionStatus.IN_PROGRESS),
            (CollectionStatus.ASSIGNED, CollectionStatus.FAILED),
            (CollectionStatus.IN_PROGRESS, CollectionStatus.COLLECTED),
            (CollectionStatus.IN_PROGRESS, CollectionStatus.FAILED),
            (CollectionStatus.FAILED, CollectionStatus.PENDING),
        ):
            validate_transition(current_status=current, target_status=target)

    def test_rejected_transitions(self):
        for current, target in (
            (CollectionStatus.PENDING, CollectionStatus.IN_PROGRESS),
            (CollectionStatus.ASSIGNED, CollectionStatus.PENDING),
            (CollectionStatus.FAILED, CollectionStatus.ASSIGNED),
            (CollectionStatus.COLLECTED, CollectionStatus.FAILED),
            (CollectionStatus.CANCELLED, CollectionStatus.PENDING),
        ):
            with self.assertRaises(CollectionWorkflowError):
                validate_transition(current_status=current, target_status=target)


class CollectionWorkflowConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.admin_user, self.branch = _lab_admin_with_branch()
        self.lab_user = LabUser.objects.get(user=self.admin_user, branch=self.branch)

    def test_concurrent_double_assign_one_succeeds(self):
        collection = _collection_pending(self.branch)
        barrier = threading.Barrier(2)
        results: list[Exception | LabCollectionRequest] = []

        def attempt():
            barrier.wait()
            try:
                results.append(
                    assign_collection(collection_id=collection.id, lab_user=self.lab_user),
                )
            except CollectionWorkflowError as exc:
                results.append(exc)

        t1 = threading.Thread(target=attempt)
        t2 = threading.Thread(target=attempt)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        successes = [r for r in results if not isinstance(r, Exception)]
        errors = [r for r in results if isinstance(r, CollectionWorkflowError)]
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(errors), 1)
        collection.refresh_from_db()
        self.assertEqual(collection.collection_status, CollectionStatus.ASSIGNED)

    def test_concurrent_start_and_fail_one_succeeds(self):
        collection = _collection_pending(self.branch)
        assign_collection(collection_id=collection.id, lab_user=self.lab_user)
        barrier = threading.Barrier(2)
        results: list[Exception | LabCollectionRequest] = []

        def start_attempt():
            barrier.wait()
            try:
                results.append(
                    start_collection(collection_id=collection.id, lab_user=self.lab_user),
                )
            except CollectionWorkflowError as exc:
                results.append(exc)

        def fail_attempt():
            barrier.wait()
            try:
                results.append(
                    mark_failed(collection_id=collection.id, lab_user=self.lab_user),
                )
            except CollectionWorkflowError as exc:
                results.append(exc)

        t1 = threading.Thread(target=start_attempt)
        t2 = threading.Thread(target=fail_attempt)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        successes = [r for r in results if not isinstance(r, Exception)]
        errors = [r for r in results if isinstance(r, CollectionWorkflowError)]
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(errors), 1)
        collection.refresh_from_db()
        self.assertIn(
            collection.collection_status,
            (CollectionStatus.IN_PROGRESS, CollectionStatus.FAILED),
        )
