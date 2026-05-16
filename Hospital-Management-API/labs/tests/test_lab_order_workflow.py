"""
Tests for lab order accept/reject workflow and auto-reject SLA.
"""

from __future__ import annotations

import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from diagnostics_engine.models import DiagnosticCategory, DiagnosticOrder, DiagnosticServiceMaster
from diagnostics_engine.models.choices import OrderStatus
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _lab_org_and_branch,
)
from labs.choices.auth import LabUserRole
from labs.choices.workflow import LabAssignmentStatus
from labs.models import LabBranch, LabOrderAssignment, LabUser
from labs.services.workflow_transitions import AUTO_REJECT_REASON, reject_stale_pending_assignments

User = get_user_model()


def _lab_admin_with_branch(*, branch_name: str = "Workflow Branch"):
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


def _other_branch(org) -> LabBranch:
    return LabBranch.objects.create(
        organization=org,
        branch_name="Other Branch",
        branch_code=f"BR-OTH-{uuid.uuid4().hex[:6]}",
        is_active=True,
        is_active_for_orders=True,
    )


def _minimal_assignment(
    branch: LabBranch,
    *,
    assignment_status: str = LabAssignmentStatus.PENDING,
):
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
        sample_collection_mode="lab",
        status=OrderStatus.CREATED,
    )
    assignment = LabOrderAssignment.objects.create(
        diagnostic_order=order,
        lab_branch=branch,
        status=assignment_status,
    )
    return assignment, order


class LabOrderWorkflowAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user, self.branch, self.org = _lab_admin_with_branch()
        self.client.force_authenticate(user=self.user)

    def _accept_url(self, assignment_id):
        return reverse("lab-order-accept", kwargs={"assignment_id": assignment_id})

    def _reject_url(self, assignment_id):
        return reverse("lab-order-reject", kwargs={"assignment_id": assignment_id})

    def test_accept_success(self):
        assignment, _ = _minimal_assignment(self.branch)
        res = self.client.post(self._accept_url(assignment.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "ACCEPTED")
        self.assertEqual(data["assignment_id"], str(assignment.id))
        self.assertIn("accepted_at", data)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, LabAssignmentStatus.ACCEPTED)

    def test_reject_success(self):
        assignment, _ = _minimal_assignment(self.branch)
        res = self.client.post(
            self._reject_url(assignment.id),
            {"reason": "Machine unavailable"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["status"], "REJECTED")
        self.assertEqual(data["rejection_reason"], "Machine unavailable")

    def test_already_accepted_returns_409(self):
        assignment, _ = _minimal_assignment(
            self.branch,
            assignment_status=LabAssignmentStatus.ACCEPTED,
        )
        res = self.client.post(self._accept_url(assignment.id))
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_already_rejected_returns_409_on_accept(self):
        assignment, _ = _minimal_assignment(
            self.branch,
            assignment_status=LabAssignmentStatus.REJECTED,
        )
        res = self.client.post(self._accept_url(assignment.id))
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_reject_already_accepted_returns_409(self):
        assignment, _ = _minimal_assignment(
            self.branch,
            assignment_status=LabAssignmentStatus.ACCEPTED,
        )
        res = self.client.post(
            self._reject_url(assignment.id),
            {"reason": "Too late"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_double_accept_returns_409(self):
        assignment, _ = _minimal_assignment(self.branch)
        self.assertEqual(
            self.client.post(self._accept_url(assignment.id)).status_code,
            status.HTTP_200_OK,
        )
        res = self.client.post(self._accept_url(assignment.id))
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_empty_reject_reason_returns_400(self):
        assignment, _ = _minimal_assignment(self.branch)
        res = self.client.post(self._reject_url(assignment.id), {"reason": "   "}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_branch_returns_404(self):
        other = _other_branch(self.org)
        assignment, _ = _minimal_assignment(other)
        res = self.client.post(self._accept_url(assignment.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_assignment_returns_404(self):
        res = self.client.post(self._accept_url(uuid.uuid4()))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_labadmin_forbidden(self):
        assignment, _ = _minimal_assignment(self.branch)
        other_user = User.objects.create_user(username=f"doc_{uuid.uuid4().hex[:8]}", password="x")
        self.client.force_authenticate(user=other_user)
        res = self.client.post(self._accept_url(assignment.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_includes_workflow_timestamps(self):
        assignment, _ = _minimal_assignment(self.branch)
        self.client.force_authenticate(user=self.user)
        self.client.post(self._accept_url(assignment.id))
        res = self.client.get(reverse("lab-orders-list"))
        row = next(r for r in res.json()["results"] if r["assignment_id"] == str(assignment.id))
        self.assertIn("assigned_at", row)
        self.assertIn("accepted_at", row)
        self.assertIsNotNone(row["accepted_at"])


@override_settings(LAB_ASSIGNMENT_AUTO_REJECT_MINUTES=60)
class LabOrderAutoRejectTests(TestCase):
    def test_stale_pending_auto_rejected(self):
        _, branch, _org = _lab_admin_with_branch()
        assignment, _ = _minimal_assignment(branch)
        old = timezone.now() - timedelta(minutes=61)
        LabOrderAssignment.objects.filter(pk=assignment.pk).update(assigned_at=old)

        count = reject_stale_pending_assignments()
        self.assertEqual(count, 1)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, LabAssignmentStatus.REJECTED)
        self.assertEqual(assignment.rejection_reason, AUTO_REJECT_REASON)
        self.assertTrue(assignment.metadata.get("auto_rejected"))

    def test_recent_pending_unchanged(self):
        _, branch, _org = _lab_admin_with_branch()
        assignment, _ = _minimal_assignment(branch)

        count = reject_stale_pending_assignments()
        self.assertEqual(count, 0)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, LabAssignmentStatus.PENDING)

    def test_accepted_assignment_unchanged_by_auto_reject(self):
        _, branch, _org = _lab_admin_with_branch()
        assignment, _ = _minimal_assignment(
            branch,
            assignment_status=LabAssignmentStatus.ACCEPTED,
        )
        old = timezone.now() - timedelta(minutes=120)
        LabOrderAssignment.objects.filter(pk=assignment.pk).update(assigned_at=old)

        count = reject_stale_pending_assignments()
        self.assertEqual(count, 0)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, LabAssignmentStatus.ACCEPTED)
