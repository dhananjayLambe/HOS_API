"""
Tests for home collection workflow and accept-time provisioning.
"""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

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
from labs.choices.workflow import CollectionStatus, LabAssignmentStatus
from labs.models import LabBranch, LabCollectionRequest, LabOrderAssignment, LabOrderTestExecution, LabUser

User = get_user_model()


def _lab_admin_with_branch(*, branch_name: str = "Collections Branch"):
    labadmin_group, _ = Group.objects.get_or_create(name="labadmin")
    user = User.objects.create_user(
        username=f"labuser_{uuid.uuid4().hex[:8]}",
        email=f"lab_{uuid.uuid4().hex[:6]}@test.example",
        password="testpass123",
        first_name="Lab",
        last_name="Admin",
    )
    user.groups.add(labadmin_group)
    org, branch = _lab_org_and_branch()
    branch.branch_name = branch_name
    branch.save(update_fields=["branch_name"])
    LabUser.objects.create(
        user=user,
        organization=org,
        branch=branch,
        role=LabUserRole.ADMIN,
        employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
        is_primary_admin=True,
    )
    return user, branch, org


def _home_assignment(branch: LabBranch, *, assignment_status: str = LabAssignmentStatus.PENDING):
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
    DiagnosticOrderTestLine.objects.create(order=order, order_item=oi, service=svc)
    assignment = LabOrderAssignment.objects.create(
        diagnostic_order=order,
        lab_branch=branch,
        status=assignment_status,
    )
    return assignment, order


class HomeCollectionWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user, self.branch, _org = _lab_admin_with_branch()
        self.client.force_authenticate(user=self.user)

    def _accept_and_get_collection(self):
        assignment, order = _home_assignment(self.branch)
        accept_url = reverse("lab-order-accept", kwargs={"assignment_id": assignment.id})
        res = self.client.post(accept_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        collection = LabCollectionRequest.objects.get(diagnostic_order=order)
        return collection, assignment, order

    def test_accept_visit_order_creates_executions_only(self):
        assignment, order = _home_assignment(self.branch)
        order.sample_collection_mode = "lab"
        order.save(update_fields=["sample_collection_mode"])
        self.client.post(reverse("lab-order-accept", kwargs={"assignment_id": assignment.id}))
        self.assertFalse(LabCollectionRequest.objects.filter(diagnostic_order=order).exists())
        self.assertEqual(
            LabOrderTestExecution.objects.filter(assignment=assignment).count(),
            order.test_lines.count(),
        )

    def test_accept_creates_collection_and_executions(self):
        collection, assignment, order = self._accept_and_get_collection()
        self.assertEqual(collection.collection_status, CollectionStatus.PENDING)
        self.assertEqual(collection.collection_type, "HOME")
        exec_count = LabOrderTestExecution.objects.filter(assignment=assignment).count()
        self.assertEqual(exec_count, order.test_lines.count())
        self.assertTrue(
            LabOrderTestExecution.objects.filter(
                assignment=assignment,
                collection_request=collection,
            ).exists(),
        )

    def test_collect_does_not_create_extra_executions(self):
        collection, assignment, order = self._accept_and_get_collection()
        before = LabOrderTestExecution.objects.filter(assignment=assignment).count()

        phleb = LabUser.objects.create(
            user=User.objects.create_user(
                username=f"phleb_{uuid.uuid4().hex[:6]}",
                password="x",
                first_name="R",
                last_name="Kulkarni",
            ),
            organization=self.branch.organization,
            branch=self.branch,
            role=LabUserRole.PHLEBOTOMIST,
            employee_code=f"PH-{uuid.uuid4().hex[:4]}",
        )
        self.client.post(
            reverse("lab-home-collection-assign", kwargs={"collection_id": collection.id}),
            {"phlebotomist_id": str(phleb.id)},
            format="json",
        )
        self.client.post(
            reverse("lab-home-collection-start", kwargs={"collection_id": collection.id}),
        )
        self.client.post(
            reverse("lab-home-collection-collect", kwargs={"collection_id": collection.id}),
        )

        after = LabOrderTestExecution.objects.filter(assignment=assignment).count()
        self.assertEqual(before, after)
        collection.refresh_from_db()
        self.assertEqual(collection.collection_status, CollectionStatus.COLLECTED)

    def test_retry_failed_to_pending(self):
        collection, _assignment, _order = self._accept_and_get_collection()
        phleb = LabUser.objects.create(
            user=User.objects.create_user(
                username=f"phleb2_{uuid.uuid4().hex[:6]}",
                password="x",
            ),
            organization=self.branch.organization,
            branch=self.branch,
            role=LabUserRole.PHLEBOTOMIST,
            employee_code=f"PH2-{uuid.uuid4().hex[:4]}",
        )
        self.client.post(
            reverse("lab-home-collection-assign", kwargs={"collection_id": collection.id}),
            {"phlebotomist_id": str(phleb.id)},
            format="json",
        )
        self.client.post(reverse("lab-home-collection-start", kwargs={"collection_id": collection.id}))
        self.client.post(
            reverse("lab-home-collection-fail", kwargs={"collection_id": collection.id}),
            {"reason": "Patient not home"},
            format="json",
        )
        res = self.client.post(
            reverse("lab-home-collection-retry", kwargs={"collection_id": collection.id}),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        collection.refresh_from_db()
        self.assertEqual(collection.collection_status, CollectionStatus.PENDING)
        self.assertEqual(collection.retry_count, 1)
        self.assertIsNone(collection.assigned_phlebotomist_id)
        events = collection.metadata.get("workflow_events") or []
        self.assertGreaterEqual(len(events), 1)

    def test_invalid_transition_returns_409(self):
        collection, _assignment, _order = self._accept_and_get_collection()
        res = self.client.post(
            reverse("lab-home-collection-collect", kwargs={"collection_id": collection.id}),
        )
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)


class HomeCollectionsListAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user, self.branch, _org = _lab_admin_with_branch()
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("lab-home-collections-list")

    def test_list_requires_accepted_assignment(self):
        assignment, order = _home_assignment(self.branch)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["total"], 0)

        self.client.post(reverse("lab-order-accept", kwargs={"assignment_id": assignment.id}))
        res2 = self.client.get(self.list_url)
        self.assertEqual(res2.json()["total"], 1)
        row = res2.json()["results"][0]
        self.assertIn("workflow_hint", row)
        self.assertIn("allowed_actions", row)
        self.assertEqual(row["collection_status"], CollectionStatus.PENDING)
