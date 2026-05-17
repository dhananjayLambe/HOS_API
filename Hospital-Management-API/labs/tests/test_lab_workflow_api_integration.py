"""
Phase 1 API integration: contracts, 409/404 matrices, auth smoke, E2E capstone.
"""

from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from labs.choices.auth import LabUserRole
from labs.choices.workflow import CollectionStatus, LabAssignmentStatus
from labs.models import LabCollectionRequest, LabOrderAssignment, LabOrderTestExecution, LabUser
from labs.services.collection_workflow import allowed_actions_for_status
from labs.tests.support.workflow_factories import (
    collection_at_status,
    home_assignment,
    lab_admin_client,
    other_branch,
)

User = get_user_model()

WORKFLOW_POST_KEYS = frozenset(
    {
        "success",
        "collection_status",
        "message",
        "collection_id",
        "allowed_actions",
        "assignment_note",
    },
)

SUMMARY_KEYS = frozenset(
    {
        "pending_collections",
        "assigned_today",
        "active_collections",
        "collected_today",
        "failed_no_response",
    },
)

INVALID_TRANSITION_CASES = [
    (CollectionStatus.PENDING, "lab-home-collection-start"),
    (CollectionStatus.PENDING, "lab-home-collection-collect"),
    (CollectionStatus.PENDING, "lab-home-collection-fail"),
    (CollectionStatus.PENDING, "lab-home-collection-retry"),
    (CollectionStatus.ASSIGNED, "lab-home-collection-collect"),
    (CollectionStatus.ASSIGNED, "lab-home-collection-retry"),
    (CollectionStatus.IN_PROGRESS, "lab-home-collection-assign"),
    (CollectionStatus.IN_PROGRESS, "lab-home-collection-retry"),
    (CollectionStatus.COLLECTED, "lab-home-collection-assign"),
    (CollectionStatus.COLLECTED, "lab-home-collection-start"),
    (CollectionStatus.COLLECTED, "lab-home-collection-collect"),
    (CollectionStatus.COLLECTED, "lab-home-collection-fail"),
    (CollectionStatus.COLLECTED, "lab-home-collection-retry"),
    (CollectionStatus.FAILED, "lab-home-collection-assign"),
    (CollectionStatus.FAILED, "lab-home-collection-start"),
    (CollectionStatus.FAILED, "lab-home-collection-collect"),
]

COLLECTION_POST_ACTIONS = [
    "lab-home-collection-assign",
    "lab-home-collection-start",
    "lab-home-collection-collect",
    "lab-home-collection-fail",
    "lab-home-collection-retry",
]


def _assert_workflow_post_response(test_case, response, *, expected_status: str):
    test_case.assertEqual(response.status_code, status.HTTP_200_OK)
    data = response.json()
    test_case.assertTrue(data["success"])
    test_case.assertEqual(set(data.keys()), WORKFLOW_POST_KEYS)
    test_case.assertEqual(data["collection_status"], expected_status)
    test_case.assertEqual(
        data["allowed_actions"],
        allowed_actions_for_status(expected_status),
    )


class LabWorkflowEndpointContractTests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, self.org = lab_admin_client()

    def test_get_orders_list_paginated(self):
        res = self.client.get(reverse("lab-orders-list"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn("results", data)
        self.assertIn("total", data)

    def test_post_accept_contract(self):
        assignment, _ = home_assignment(self.branch)
        res = self.client.post(reverse("lab-order-accept", kwargs={"assignment_id": assignment.id}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "ACCEPTED")
        self.assertIn("assignment_id", data)
        self.assertIn("accepted_at", data)

    def test_post_reject_contract(self):
        assignment, _ = home_assignment(self.branch)
        res = self.client.post(
            reverse("lab-order-reject", kwargs={"assignment_id": assignment.id}),
            {"reason": "Declined"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["status"], "REJECTED")
        self.assertEqual(data["rejection_reason"], "Declined")
        self.assertIn("rejected_at", data)

    def test_get_home_collections_list_contract(self):
        assignment, _ = home_assignment(self.branch)
        self.client.post(reverse("lab-order-accept", kwargs={"assignment_id": assignment.id}))
        res = self.client.get(reverse("lab-home-collections-list"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        row = res.json()["results"][0]
        for key in ("workflow_hint", "allowed_actions", "collection_status", "retry_count"):
            self.assertIn(key, row)

    def test_get_home_collections_summary_contract(self):
        res = self.client.get(reverse("lab-home-collections-summary"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(set(res.json().keys()), SUMMARY_KEYS)

    def test_get_phlebotomists_branch_scoped(self):
        phleb_user = User.objects.create_user(username=f"phleb_{uuid.uuid4().hex[:6]}", password="x")
        LabUser.objects.create(
            user=phleb_user,
            organization=self.lab_user.organization,
            branch=self.branch,
            role=LabUserRole.PHLEBOTOMIST,
            employee_code=f"PH-{uuid.uuid4().hex[:4]}",
        )
        other_phleb = User.objects.create_user(username=f"phleb_o_{uuid.uuid4().hex[:6]}", password="x")
        other_br = other_branch(self.org)
        LabUser.objects.create(
            user=other_phleb,
            organization=self.lab_user.organization,
            branch=other_br,
            role=LabUserRole.PHLEBOTOMIST,
            employee_code=f"PH-O-{uuid.uuid4().hex[:4]}",
        )
        res = self.client.get(reverse("lab-phlebotomists-list"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in res.json()}
        self.assertIn(str(LabUser.objects.get(user=phleb_user).id), ids)
        self.assertNotIn(str(LabUser.objects.get(user=other_phleb).id), ids)

    def test_collection_workflow_post_contracts(self):
        collection, _, _ = collection_at_status(self.client, self.branch, CollectionStatus.PENDING)
        res = self.client.post(
            reverse("lab-home-collection-assign", kwargs={"collection_id": collection.id}),
            {"assignment_note": "Note"},
            format="json",
        )
        _assert_workflow_post_response(self, res, expected_status=CollectionStatus.ASSIGNED)

        res = self.client.post(reverse("lab-home-collection-start", kwargs={"collection_id": collection.id}))
        _assert_workflow_post_response(self, res, expected_status=CollectionStatus.IN_PROGRESS)

        res = self.client.post(reverse("lab-home-collection-collect", kwargs={"collection_id": collection.id}))
        _assert_workflow_post_response(self, res, expected_status=CollectionStatus.COLLECTED)


class InvalidTransitionAPITests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def test_invalid_transition_matrix_returns_409(self):
        for from_status, url_name in INVALID_TRANSITION_CASES:
            with self.subTest(from_status=from_status, action=url_name):
                collection, _, _ = collection_at_status(self.client, self.branch, from_status)
                payload = {"reason": "bad"} if url_name == "lab-home-collection-fail" else {}
                if url_name == "lab-home-collection-assign":
                    payload = {"assignment_note": "x"}
                res = self.client.post(
                    reverse(url_name, kwargs={"collection_id": collection.id}),
                    payload,
                    format="json",
                )
                self.assertEqual(res.status_code, status.HTTP_409_CONFLICT, res.content)
                detail = res.json().get("detail", "")
                self.assertTrue(len(str(detail)) > 0)

    def test_double_collect_returns_409(self):
        collection, assignment, order = collection_at_status(
            self.client,
            self.branch,
            CollectionStatus.COLLECTED,
        )
        exec_count = LabOrderTestExecution.objects.filter(assignment=assignment).count()
        res = self.client.post(
            reverse("lab-home-collection-collect", kwargs={"collection_id": collection.id}),
        )
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            LabOrderTestExecution.objects.filter(assignment=assignment).count(),
            exec_count,
        )
        self.assertEqual(exec_count, order.test_lines.count())


class BranchIsolationAPITests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, self.org = lab_admin_client()

    def _collection_on_other_branch(self) -> LabCollectionRequest:
        other = other_branch(self.org)
        assignment, order = home_assignment(other, assignment_status=LabAssignmentStatus.ACCEPTED)
        return LabCollectionRequest.objects.create(
            diagnostic_order=order,
            lab_branch=other,
            preferred_date=order.created_at.date(),
            preferred_slot="Flexible",
            address_snapshot={},
            collection_status=CollectionStatus.PENDING,
        )

    def test_cross_branch_post_actions_return_404(self):
        collection = self._collection_on_other_branch()
        for url_name in COLLECTION_POST_ACTIONS:
            with self.subTest(action=url_name):
                payload = {}
                if url_name == "lab-home-collection-assign":
                    payload = {"assignment_note": "x"}
                elif url_name == "lab-home-collection-fail":
                    payload = {"reason": "x"}
                res = self.client.post(
                    reverse(url_name, kwargs={"collection_id": collection.id}),
                    payload,
                    format="json",
                )
                self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
                self.assertEqual(res.json().get("detail"), "Collection not found.")

    def test_list_excludes_other_branch_collection(self):
        collection = self._collection_on_other_branch()
        assignment, order = home_assignment(self.branch)
        self.client.post(reverse("lab-order-accept", kwargs={"assignment_id": assignment.id}))
        res = self.client.get(reverse("lab-home-collections-list"))
        ids = {row["id"] for row in res.json()["results"]}
        self.assertNotIn(str(collection.id), ids)

    def test_summary_excludes_other_branch(self):
        self._collection_on_other_branch()
        res = self.client.get(reverse("lab-home-collections-summary"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["pending_collections"], 0)

    def test_assign_cross_branch_phlebotomist_returns_404(self):
        other = other_branch(self.org)
        phleb_user = User.objects.create_user(username=f"phleb_x_{uuid.uuid4().hex[:6]}", password="x")
        phleb = LabUser.objects.create(
            user=phleb_user,
            organization=self.lab_user.organization,
            branch=other,
            role=LabUserRole.PHLEBOTOMIST,
            employee_code=f"PH-X-{uuid.uuid4().hex[:4]}",
        )
        collection, _, _ = collection_at_status(self.client, self.branch, CollectionStatus.PENDING)
        res = self.client.post(
            reverse("lab-home-collection-assign", kwargs={"collection_id": collection.id}),
            {"phlebotomist_id": str(phleb.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.json().get("detail"), "Phlebotomist not found.")


class RetryWorkflowAPITests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def test_retry_only_from_failed(self):
        for from_status in (
            CollectionStatus.PENDING,
            CollectionStatus.ASSIGNED,
            CollectionStatus.IN_PROGRESS,
            CollectionStatus.COLLECTED,
        ):
            with self.subTest(status=from_status):
                collection, _, _ = collection_at_status(self.client, self.branch, from_status)
                res = self.client.post(
                    reverse("lab-home-collection-retry", kwargs={"collection_id": collection.id}),
                )
                self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_multi_retry_lifecycle_retry_count_two(self):
        collection, _, _ = collection_at_status(self.client, self.branch, CollectionStatus.FAILED)
        self.client.post(reverse("lab-home-collection-retry", kwargs={"collection_id": collection.id}))
        collection.refresh_from_db()
        self.assertEqual(collection.retry_count, 1)

        self.client.post(
            reverse("lab-home-collection-assign", kwargs={"collection_id": collection.id}),
            {"assignment_note": "Retry 1"},
            format="json",
        )
        self.client.post(reverse("lab-home-collection-start", kwargs={"collection_id": collection.id}))
        self.client.post(
            reverse("lab-home-collection-fail", kwargs={"collection_id": collection.id}),
            {"reason": "Still absent"},
            format="json",
        )
        self.client.post(reverse("lab-home-collection-retry", kwargs={"collection_id": collection.id}))
        collection.refresh_from_db()
        self.assertEqual(collection.retry_count, 2)
        self.assertEqual(collection.collection_status, CollectionStatus.PENDING)
        self.assertIsNone(collection.assigned_phlebotomist_id)
        retries = collection.metadata.get("retries") or []
        self.assertGreaterEqual(len(retries), 2)
        events = collection.metadata.get("workflow_events") or []
        self.assertGreater(len(events), 0)

        res = self.client.get(reverse("lab-home-collections-list"))
        row = next(r for r in res.json()["results"] if r["id"] == str(collection.id))
        self.assertEqual(row["retry_count"], 2)
        self.assertIn("assign", row["allowed_actions"])


class WorkflowAuthSmokeTests(TestCase):
    """401 unauthenticated and 403 non-labadmin for every workflow route."""

    def setUp(self):
        self.auth_client, self.lab_user, self.branch, _org = lab_admin_client()
        assignment, order = home_assignment(self.branch)
        self.auth_client.post(reverse("lab-order-accept", kwargs={"assignment_id": assignment.id}))
        self.collection = LabCollectionRequest.objects.get(diagnostic_order=order)
        self.assignment = assignment

        self.other_user = User.objects.create_user(
            username=f"doc_{uuid.uuid4().hex[:8]}",
            password="x",
        )

    def _endpoints(self):
        cid = self.collection.id
        aid = self.assignment.id
        return [
            ("get", reverse("lab-orders-list"), None),
            ("get", reverse("lab-home-collections-list"), None),
            ("get", reverse("lab-home-collections-summary"), None),
            ("get", reverse("lab-phlebotomists-list"), None),
            ("post", reverse("lab-order-accept", kwargs={"assignment_id": aid}), None),
            ("post", reverse("lab-order-reject", kwargs={"assignment_id": aid}), {"reason": "x"}),
            ("post", reverse("lab-home-collection-assign", kwargs={"collection_id": cid}), {}),
            ("post", reverse("lab-home-collection-start", kwargs={"collection_id": cid}), None),
            ("post", reverse("lab-home-collection-collect", kwargs={"collection_id": cid}), None),
            ("post", reverse("lab-home-collection-fail", kwargs={"collection_id": cid}), {"reason": "x"}),
            ("post", reverse("lab-home-collection-retry", kwargs={"collection_id": cid}), None),
        ]

    def test_unauthenticated_returns_401(self):
        client = APIClient()
        for method, url, body in self._endpoints():
            with self.subTest(method=method, url=url):
                if method == "get":
                    res = client.get(url)
                else:
                    res = client.post(url, body or {}, format="json")
                self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_labadmin_returns_403(self):
        client = APIClient()
        client.force_authenticate(user=self.other_user)
        for method, url, body in self._endpoints():
            with self.subTest(method=method, url=url):
                if method == "get":
                    res = client.get(url)
                else:
                    res = client.post(url, body or {}, format="json")
                self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class LabWorkflowE2ECapstoneTests(TestCase):
    def test_full_home_operator_journey(self):
        client, lab_user, branch, _org = lab_admin_client()
        assignment, order = home_assignment(branch)

        accept_res = client.post(reverse("lab-order-accept", kwargs={"assignment_id": assignment.id}))
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, LabAssignmentStatus.ACCEPTED)

        collection = LabCollectionRequest.objects.get(diagnostic_order=order)
        self.assertEqual(collection.lab_branch_id, branch.id)
        self.assertEqual(collection.collection_status, CollectionStatus.PENDING)
        self.assertEqual(LabOrderTestExecution.objects.filter(assignment=assignment).count(), 0)

        client.post(
            reverse("lab-home-collection-assign", kwargs={"collection_id": collection.id}),
            {"assignment_note": "Capstone assign"},
            format="json",
        )
        client.post(reverse("lab-home-collection-start", kwargs={"collection_id": collection.id}))
        collect_res = client.post(
            reverse("lab-home-collection-collect", kwargs={"collection_id": collection.id}),
        )
        _assert_workflow_post_response(self, collect_res, expected_status=CollectionStatus.COLLECTED)

        collection.refresh_from_db()
        assignment.refresh_from_db()
        self.assertEqual(collection.collection_status, CollectionStatus.COLLECTED)
        self.assertEqual(assignment.status, LabAssignmentStatus.ACCEPTED)
        self.assertEqual(
            LabOrderTestExecution.objects.filter(assignment=assignment).count(),
            order.test_lines.count(),
        )
        exec_row = LabOrderTestExecution.objects.filter(assignment=assignment).first()
        self.assertEqual(exec_row.lab_branch_id, branch.id)
        self.assertEqual(exec_row.collection_request_id, collection.id)
        events = collection.metadata.get("workflow_events") or []
        self.assertGreaterEqual(len(events), 3)
        self.assertEqual(
            collect_res.json()["allowed_actions"],
            allowed_actions_for_status(CollectionStatus.COLLECTED),
        )
