"""Unit tests for collection_request_provisioning."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.test import TestCase
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
from labs.choices.workflow import CollectionStatus, LabAssignmentStatus
from labs.models import LabCollectionRequest, LabOrderAssignment
from labs.services.collection_request_provisioning import (
    ProvisioningError,
    build_address_snapshot_from_order,
    ensure_lab_collection_request,
)


def _assignment(*, mode: str = "home"):
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


class CollectionRequestProvisioningTests(TestCase):
    def test_rejects_non_home_mode(self):
        assignment, _, _ = _assignment(mode="lab")
        with self.assertRaises(ProvisioningError):
            ensure_lab_collection_request(assignment=assignment)

    def test_idempotent_create(self):
        assignment, order, _ = _assignment()
        c1, created1 = ensure_lab_collection_request(assignment=assignment)
        c2, created2 = ensure_lab_collection_request(assignment=assignment)
        self.assertTrue(created1)
        self.assertFalse(created2)
        self.assertEqual(c1.id, c2.id)
        self.assertEqual(
            LabCollectionRequest.objects.filter(diagnostic_order=order).count(),
            1,
        )

    def test_metadata_and_address_snapshot(self):
        assignment, order, _ = _assignment()
        collection, _ = ensure_lab_collection_request(assignment=assignment)
        self.assertEqual(collection.collection_status, CollectionStatus.PENDING)
        self.assertEqual(collection.metadata.get("provisioned_by"), "system")
        self.assertEqual(
            collection.metadata.get("provisioned_from_assignment_id"),
            str(assignment.id),
        )
        self.assertEqual(
            collection.address_snapshot,
            build_address_snapshot_from_order(order),
        )

    def test_preferred_slot_flexible_fallback(self):
        assignment, order, _ = _assignment()
        order.scheduled_at = None
        order.save(update_fields=["scheduled_at"])
        collection, _ = ensure_lab_collection_request(assignment=assignment)
        self.assertEqual(collection.preferred_slot, "Flexible")
        self.assertEqual(collection.preferred_date, timezone.localdate())
