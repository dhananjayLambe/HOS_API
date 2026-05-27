"""
Integration tests for GET /api/labs/orders/ (lab dashboard order register).
"""

from __future__ import annotations

import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from diagnostics_engine.models import DiagnosticOrder
from diagnostics_engine.models.choices import OrderLineType, OrderStatus
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _lab_org_and_branch,
)
from labs.choices.workflow import LabAssignmentStatus
from labs.models import LabBranch, LabCollectionRequest, LabOrderAssignment, LabUser
from labs.choices.auth import LabUserRole

User = get_user_model()


def _lab_admin_with_branch(*, branch_name: str = "Pune Branch"):
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


def _create_assignment_on_branch(
    branch: LabBranch,
    *,
    order_number: str | None = None,
    assignment_status: str = LabAssignmentStatus.PENDING,
    sample_collection_mode: str = "home",
    patient_first: str = "Anita",
    patient_last: str = "Deshmukh",
    patient_phone: str | None = None,
    urgency=None,
):
    from clinic.models import Clinic
    from consultations_core.models.investigation import InvestigationUrgency

    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    doc_user, doc_profile = _doctor_user_and_profile(clinic)
    catalog_svc = _catalog_service_for_tests()
    consultation, encounter, profile, _, items, _ = _consultation_with_investigations(
        doc_user,
        doc_profile,
        with_catalog=True,
        svc=catalog_svc,
    )
    profile.first_name = patient_first
    profile.last_name = patient_last
    profile.save(update_fields=["first_name", "last_name"])
    phone = patient_phone or f"9{uuid.uuid4().int % 10**9:09d}"
    user = profile.account.user
    user.username = phone
    user.save(update_fields=["username"])

    order = DiagnosticOrder.objects.create(
        order_number=order_number or f"ORD-{uuid.uuid4().hex[:6].upper()}",
        encounter=encounter,
        consultation=consultation,
        patient_profile=profile,
        doctor=doc_profile,
        branch=branch,
        sample_collection_mode=sample_collection_mode,
        status=OrderStatus.CREATED,
    )

    from decimal import Decimal
    from diagnostics_engine.models import DiagnosticOrderItem, DiagnosticOrderTestLine

    inv = items[0] if items else None
    if inv and inv.catalog_item_id:
        catalog_svc = inv.catalog_item
    oi = DiagnosticOrderItem.objects.create(
        order=order,
        line_type=OrderLineType.TEST,
        service=catalog_svc,
        name_snapshot=catalog_svc.name,
        price_snapshot=Decimal("50.00"),
        metadata_snapshot={"investigation_item_id": str(inv.id)} if inv else {},
    )
    if inv:
        inv.diagnostic_order_item = oi
        if urgency:
            inv.urgency = urgency
        inv.save(update_fields=["diagnostic_order_item", "urgency"] if urgency else ["diagnostic_order_item"])
    DiagnosticOrderTestLine.objects.create(
        order=order,
        order_item=oi,
        service=catalog_svc,
    )

    if sample_collection_mode == "home":
        LabCollectionRequest.objects.create(
            diagnostic_order=order,
            lab_branch=branch,
            preferred_date=timezone.now().date(),
            preferred_slot="4-6 PM",
            address_snapshot={"address_line_1": "1 Test Lane", "city": "Pune", "pincode": "411001"},
        )

    assignment = LabOrderAssignment.objects.create(
        diagnostic_order=order,
        lab_branch=branch,
        status=assignment_status,
    )
    return assignment, order, profile, phone


def _catalog_service_for_tests():
    """Fresh catalog row per call — avoids stale FKs when the test DB is reused."""
    from diagnostics_engine.tests.test_order_creation_service import _create_catalog_service

    return _create_catalog_service(name="CBC")


class LabOrdersListAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("lab-orders-list")

    def test_labadmin_with_assignment_returns_200_and_contract_shape(self):
        """
        Sample contract:
        status PENDING, urgency ROUTINE, collection_type HOME, pagination envelope.
        """
        user, branch, _org = _lab_admin_with_branch()
        assignment, order, _profile, phone = _create_assignment_on_branch(
            branch,
            order_number="ORD-10492",
            patient_phone="9123456789",
        )

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn("results", data)
        self.assertIn("page", data)
        self.assertIn("page_size", data)
        self.assertIn("total", data)
        self.assertIn("total_pages", data)
        self.assertEqual(data["total"], 1)
        self.assertEqual(len(data["results"]), 1)

        row = data["results"][0]
        self.assertEqual(row["order_number"], "ORD-10492")
        self.assertEqual(row["id"], str(order.id))
        self.assertEqual(row["assignment_id"], str(assignment.id))
        self.assertEqual(row["patient_name"], "Anita Deshmukh")
        self.assertEqual(row["patient_phone"], phone)
        self.assertEqual(row["status"], "PENDING")
        self.assertEqual(row["collection_type"], "HOME")
        self.assertTrue(row["home_collection"])
        self.assertEqual(row["urgency"], "ROUTINE")
        self.assertIn("CBC", row["test_names"])
        self.assertIn("preferred_slot_label", row)
        self.assertIn("created_at", row)

    def test_non_lab_user_forbidden(self):
        user = User.objects.create_user(username=f"doc_{uuid.uuid4().hex[:8]}", password="x")
        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_labadmin_without_lab_user_returns_404(self):
        labadmin_group, _ = Group.objects.get_or_create(name="labadmin")
        user = User.objects.create_user(username=f"labonly_{uuid.uuid4().hex[:8]}", password="x")
        user.groups.add(labadmin_group)
        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.json().get("code"), "lab_profile_missing")

    def test_branch_scoping_excludes_other_branch(self):
        user, branch, org = _lab_admin_with_branch()
        other = _other_branch(org)
        _create_assignment_on_branch(branch, order_number="ORD-MINE")
        _create_assignment_on_branch(other, order_number="ORD-OTHER")

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        numbers = {r["order_number"] for r in res.json()["results"]}
        self.assertEqual(numbers, {"ORD-MINE"})

    def test_pagination(self):
        user, branch, _org = _lab_admin_with_branch()
        for i in range(3):
            _create_assignment_on_branch(branch, order_number=f"ORD-P{i}")

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url, {"page": 1, "page_size": 2})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["page_size"], 2)
        self.assertEqual(data["total"], 3)
        self.assertEqual(data["total_pages"], 2)
        self.assertEqual(len(data["results"]), 2)

    def test_search_by_order_number(self):
        user, branch, _org = _lab_admin_with_branch()
        _create_assignment_on_branch(branch, order_number="ORD-FINDME")
        _create_assignment_on_branch(branch, order_number="ORD-OTHER99")

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url, {"q": "FINDME"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["total"], 1)
        self.assertEqual(res.json()["results"][0]["order_number"], "ORD-FINDME")

    def test_search_by_patient_name(self):
        user, branch, _org = _lab_admin_with_branch()
        _create_assignment_on_branch(branch, patient_first="Unique", patient_last="Patient")
        _create_assignment_on_branch(branch, patient_first="Other", patient_last="Person")

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url, {"q": "Unique"})
        self.assertEqual(res.json()["total"], 1)
        self.assertIn("Unique", res.json()["results"][0]["patient_name"])

    def test_search_by_patient_full_name(self):
        user, branch, _org = _lab_admin_with_branch()
        _create_assignment_on_branch(branch, patient_first="Unique", patient_last="Patient")
        _create_assignment_on_branch(branch, patient_first="Other", patient_last="Person")

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url, {"q": "Unique Patient"})
        self.assertEqual(res.json()["total"], 1)
        self.assertIn("Unique", res.json()["results"][0]["patient_name"])

    def test_status_filter(self):
        user, branch, _org = _lab_admin_with_branch()
        _create_assignment_on_branch(branch, order_number="ORD-PEN", assignment_status=LabAssignmentStatus.PENDING)
        _create_assignment_on_branch(
            branch,
            order_number="ORD-PROG",
            assignment_status=LabAssignmentStatus.IN_PROGRESS,
        )

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url, {"status": "IN_PROGRESS"})
        self.assertEqual(res.json()["total"], 1)
        self.assertEqual(res.json()["results"][0]["order_number"], "ORD-PROG")

    def test_collection_type_filter(self):
        user, branch, _org = _lab_admin_with_branch()
        _create_assignment_on_branch(branch, order_number="ORD-HOME", sample_collection_mode="home")
        _create_assignment_on_branch(branch, order_number="ORD-VISIT", sample_collection_mode="lab")

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url, {"collection_type": "VISIT"})
        self.assertEqual(res.json()["total"], 1)
        self.assertEqual(res.json()["results"][0]["collection_type"], "VISIT")
        self.assertFalse(res.json()["results"][0]["home_collection"])

    def test_date_filter_on_assigned_at(self):
        user, branch, _org = _lab_admin_with_branch()
        assignment, _, _, _ = _create_assignment_on_branch(branch, order_number="ORD-DATE")
        old = timezone.now() - timedelta(days=10)
        LabOrderAssignment.objects.filter(pk=assignment.pk).update(assigned_at=old)

        today = timezone.now().date().isoformat()
        self.client.force_authenticate(user=user)
        res = self.client.get(self.url, {"date_from": today, "date_to": today})
        self.assertEqual(res.json()["total"], 0)

        past = (timezone.now() - timedelta(days=15)).date().isoformat()
        res2 = self.client.get(self.url, {"date_from": past, "date_to": timezone.now().date().isoformat()})
        self.assertEqual(res2.json()["total"], 1)

    def test_urgency_filter_stat(self):
        from consultations_core.models.investigation import InvestigationUrgency

        user, branch, _org = _lab_admin_with_branch()
        _create_assignment_on_branch(
            branch,
            order_number="ORD-STAT",
            urgency=InvestigationUrgency.STAT,
        )
        _create_assignment_on_branch(
            branch,
            order_number="ORD-ROUT",
            urgency=InvestigationUrgency.ROUTINE,
        )

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url, {"urgency": "STAT"})
        self.assertEqual(res.json()["total"], 1)
        self.assertEqual(res.json()["results"][0]["urgency"], "STAT")

    def test_empty_queue(self):
        user, branch, _org = _lab_admin_with_branch()
        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["total"], 0)
        self.assertEqual(data["results"], [])

    def test_ordering_assigned_at_desc(self):
        user, branch, _org = _lab_admin_with_branch()
        a1, _, _, _ = _create_assignment_on_branch(branch, order_number="ORD-OLD")
        a2, _, _, _ = _create_assignment_on_branch(branch, order_number="ORD-NEW")
        now = timezone.now()
        LabOrderAssignment.objects.filter(pk=a1.pk).update(assigned_at=now - timedelta(hours=2))
        LabOrderAssignment.objects.filter(pk=a2.pk).update(assigned_at=now - timedelta(hours=1))

        self.client.force_authenticate(user=user)
        res = self.client.get(self.url, {"ordering": "-assigned_at"})
        numbers = [r["order_number"] for r in res.json()["results"]]
        self.assertEqual(numbers[0], "ORD-NEW")


class LabOrderAssignmentDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_assignment_detail_same_branch(self):
        user, branch, _org = _lab_admin_with_branch()
        assignment, order, _, _ = _create_assignment_on_branch(
            branch,
            order_number="ORD-DRAWER-1",
        )

        self.client.force_authenticate(user=user)
        url = reverse("lab-order-assignment-detail", kwargs={"assignment_id": assignment.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["order_number"], "ORD-DRAWER-1")
        self.assertEqual(str(res.json()["assignment_id"]), str(assignment.id))
        self.assertEqual(str(res.json()["id"]), str(order.id))

    def test_assignment_detail_branch_isolation(self):
        user, branch, org = _lab_admin_with_branch(branch_name="Drawer Branch A")
        other = _other_branch(org)
        other_assignment, _, _, _ = _create_assignment_on_branch(
            other,
            order_number="ORD-OTHER-BRANCH",
        )

        self.client.force_authenticate(user=user)
        url = reverse("lab-order-assignment-detail", kwargs={"assignment_id": other_assignment.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
