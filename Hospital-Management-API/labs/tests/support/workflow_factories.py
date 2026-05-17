"""
Shared factories for lab workflow API and service tests (Phase 1 hardening).
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
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
from labs.models import LabBranch, LabCollectionRequest, LabOrderAssignment, LabUser

if TYPE_CHECKING:
    from labs.models import LabOrganization

User = get_user_model()


def other_branch(org: LabOrganization, *, branch_name: str = "Other Branch") -> LabBranch:
    return LabBranch.objects.create(
        organization=org,
        branch_name=branch_name,
        branch_code=f"BR-OTH-{uuid.uuid4().hex[:6]}",
        is_active=True,
        is_active_for_orders=True,
    )


def lab_admin_client(*, branch_name: str = "Workflow Branch"):
    """Return authenticated API client, lab user, branch, and org."""
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
    lab_user = LabUser.objects.create(
        user=user,
        organization=org,
        branch=branch,
        role=LabUserRole.ADMIN,
        employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
        is_primary_admin=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client, lab_user, branch, org


def home_assignment(
    branch: LabBranch,
    *,
    assignment_status: str = LabAssignmentStatus.PENDING,
    with_test_lines: bool = True,
):
    """Create a home-collection diagnostic order and lab assignment."""
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
    if with_test_lines:
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
    assignment = LabOrderAssignment.objects.create(
        diagnostic_order=order,
        lab_branch=branch,
        status=assignment_status,
    )
    return assignment, order


def lab_mode_assignment(
    branch: LabBranch,
    *,
    assignment_status: str = LabAssignmentStatus.PENDING,
):
    """Create a lab-visit (non-home) assignment."""
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


def accept_home_collection(client: APIClient, assignment: LabOrderAssignment) -> LabCollectionRequest:
    """Accept assignment via API and return provisioned collection."""
    url = reverse("lab-order-accept", kwargs={"assignment_id": assignment.id})
    res = client.post(url)
    assert res.status_code == 200, res.content
    return LabCollectionRequest.objects.get(diagnostic_order=assignment.diagnostic_order)


def collection_at_status(
    client: APIClient,
    branch: LabBranch,
    target_status: str,
    *,
    lab_user: LabUser | None = None,
) -> tuple[LabCollectionRequest, LabOrderAssignment, DiagnosticOrder]:
    """
    Accept a home order and advance collection to target_status via API.

    Supported: PENDING, ASSIGNED, IN_PROGRESS, FAILED, COLLECTED.
    """
    assignment, order = home_assignment(branch, assignment_status=LabAssignmentStatus.PENDING)
    collection = accept_home_collection(client, assignment)
    assignment.refresh_from_db()

    if target_status == CollectionStatus.PENDING:
        return collection, assignment, order

    client.post(
        reverse("lab-home-collection-assign", kwargs={"collection_id": collection.id}),
        {"assignment_note": "Test assign"},
        format="json",
    )
    collection.refresh_from_db()
    if target_status == CollectionStatus.ASSIGNED:
        return collection, assignment, order

    client.post(reverse("lab-home-collection-start", kwargs={"collection_id": collection.id}))
    collection.refresh_from_db()
    if target_status == CollectionStatus.IN_PROGRESS:
        return collection, assignment, order

    if target_status == CollectionStatus.FAILED:
        client.post(
            reverse("lab-home-collection-fail", kwargs={"collection_id": collection.id}),
            {"reason": "Test fail"},
            format="json",
        )
        collection.refresh_from_db()
        return collection, assignment, order

    if target_status == CollectionStatus.COLLECTED:
        client.post(reverse("lab-home-collection-collect", kwargs={"collection_id": collection.id}))
        collection.refresh_from_db()
        assignment.refresh_from_db()
        return collection, assignment, order

    raise ValueError(f"Unsupported target_status: {target_status}")
