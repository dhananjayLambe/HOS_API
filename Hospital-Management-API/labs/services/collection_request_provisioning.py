"""Provision LabCollectionRequest for home-collection logistics (order-level only)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from labs.choices.workflow import CollectionStatus
from labs.models import LabCollectionRequest

if TYPE_CHECKING:
    from diagnostics_engine.models.orders import DiagnosticOrder
    from labs.models import LabOrderAssignment


class ProvisioningError(ValueError):
    """Invalid provisioning context (mode, assignment, or workflow state)."""


def build_address_snapshot_from_order(order: DiagnosticOrder) -> dict:
    """Immutable address JSON for collection logistics (no live FK to patient address)."""
    profile = order.patient_profile
    snapshot: dict = {}
    if profile:
        for key in ("address_line_1", "address_line_2", "landmark", "city", "state", "pincode"):
            val = getattr(profile, key, None)
            if val:
                snapshot[key] = val
    meta = getattr(order, "metadata", None) or {}
    if isinstance(meta, dict):
        addr = meta.get("delivery_address") or meta.get("address") or meta.get("home_address")
        if isinstance(addr, dict):
            snapshot = {**snapshot, **{k: v for k, v in addr.items() if v}}
    return snapshot


def preferred_slot_from_order(order: DiagnosticOrder) -> tuple:
    """Return (preferred_date, preferred_slot label)."""
    today = timezone.localdate()
    slot_label = "Flexible"
    if order.scheduled_at:
        local = timezone.localtime(order.scheduled_at)
        today = local.date()
        slot_label = local.strftime("%I:%M %p").lstrip("0")
    meta = getattr(order, "metadata", None) or {}
    if isinstance(meta, dict):
        slot_label = (
            meta.get("preferred_slot")
            or meta.get("collection_slot")
            or meta.get("home_collection_slot")
            or slot_label
        )
    return today, str(slot_label)[:30]


def ensure_lab_collection_request(
    *,
    assignment: LabOrderAssignment,
) -> tuple[LabCollectionRequest, bool]:
    """
    Idempotent: one LabCollectionRequest per diagnostic order (home logistics only).

    Does not create test executions, mutate assignment status, or handle transitions.
    """
    order = assignment.diagnostic_order
    if (order.sample_collection_mode or "lab") != "home":
        raise ProvisioningError(
            "LabCollectionRequest can only be provisioned for home sample collection orders.",
        )

    preferred_date, preferred_slot = preferred_slot_from_order(order)
    provision_metadata = {
        "provisioned_from_assignment_id": str(assignment.id),
        "provisioned_by": "system",
    }

    with transaction.atomic():
        collection, created = LabCollectionRequest.objects.get_or_create(
            diagnostic_order=order,
            defaults={
                "lab_branch": assignment.lab_branch,
                "collection_status": CollectionStatus.PENDING,
                "collection_type": "HOME",
                "preferred_date": preferred_date,
                "preferred_slot": preferred_slot,
                "address_snapshot": build_address_snapshot_from_order(order),
                "metadata": provision_metadata,
            },
        )
        if not created:
            if collection.lab_branch_id != assignment.lab_branch_id:
                collection.lab_branch = assignment.lab_branch
                collection.save(update_fields=["lab_branch", "updated_at"])

    return collection, created
