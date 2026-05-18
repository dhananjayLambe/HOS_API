"""HOME accept provisioning invariants — collection only, no early executions."""

from __future__ import annotations

from django.test import TestCase
from django.urls import reverse
from rest_framework import status

from labs.choices.workflow import CollectionStatus, LabAssignmentStatus
from labs.models import LabCollectionRequest, LabOrderAssignment, LabOrderTestExecution
from labs.services.collection_request_provisioning import build_address_snapshot_from_order
from labs.tests.support.workflow_factories import home_assignment, lab_admin_client


class HomeAcceptProvisioningTests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def _accept_url(self, assignment_id):
        return reverse("lab-order-accept", kwargs={"assignment_id": assignment_id})

    def test_accept_home_creates_single_collection(self):
        assignment, order = home_assignment(self.branch)
        res = self.client.post(self._accept_url(assignment.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        collections = LabCollectionRequest.objects.filter(diagnostic_order=order)
        self.assertEqual(collections.count(), 1)
        collection = collections.get()
        self.assertEqual(collection.collection_type, "HOME")
        self.assertEqual(collection.collection_status, CollectionStatus.PENDING)

    def test_double_accept_idempotent(self):
        assignment, order = home_assignment(self.branch)
        self.assertEqual(self.client.post(self._accept_url(assignment.id)).status_code, 200)
        res2 = self.client.post(self._accept_url(assignment.id))
        self.assertEqual(res2.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(LabCollectionRequest.objects.filter(diagnostic_order=order).count(), 1)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, LabAssignmentStatus.ACCEPTED)

    def test_collection_linked_to_order_and_branch(self):
        assignment, order = home_assignment(self.branch)
        self.client.post(self._accept_url(assignment.id))
        collection = LabCollectionRequest.objects.get(diagnostic_order=order)
        self.assertEqual(collection.diagnostic_order_id, order.id)
        self.assertEqual(collection.lab_branch_id, assignment.lab_branch_id)

    def test_no_executions_after_accept(self):
        assignment, order = home_assignment(self.branch)
        self.client.post(self._accept_url(assignment.id))
        self.assertEqual(
            LabOrderTestExecution.objects.filter(assignment=assignment).count(),
            0,
        )

    def test_address_snapshot_matches_provisioning_helper(self):
        assignment, order = home_assignment(self.branch)
        self.client.post(self._accept_url(assignment.id))
        collection = LabCollectionRequest.objects.get(diagnostic_order=order)
        expected = build_address_snapshot_from_order(order)
        self.assertEqual(collection.address_snapshot, expected)

    def test_preferred_slot_from_scheduled_at(self):
        from django.utils import timezone

        assignment, order = home_assignment(self.branch)
        order.scheduled_at = timezone.localtime().replace(
            hour=9, minute=30, second=0, microsecond=0
        )
        order.save(update_fields=["scheduled_at"])
        self.client.post(self._accept_url(assignment.id))
        collection = LabCollectionRequest.objects.get(diagnostic_order=order)
        self.assertIn("9:", collection.preferred_slot)
