"""Shared helpers for routing decision audit tests."""

from __future__ import annotations

import uuid
from decimal import Decimal
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone

from business_audit.tests.booking.support import setup_booking_context, create_booking_order
from diagnostics_engine.models.routing import RoutingRun
from diagnostics_engine.choices.routing import RoutingStatus

from tests.factories.clinic import ClinicFactory


def routing_audit_ids(*, clinic=None):
    clinic = clinic or ClinicFactory()
    return {
        "decision_id": str(uuid.uuid4()),
        "routing_id": str(uuid.uuid4()),
        "booking_id": str(uuid.uuid4()),
        "attempt_number": 1,
        "recommendation_id": str(uuid.uuid4()),
        "correlation_id": str(uuid.uuid4()),
        "organization_id": str(clinic.id),
    }


def candidate_stub(
    *,
    lab_id=None,
    branch_id=None,
    price=850.0,
    tat_hours=2,
    distance_km=4.2,
    eligible=True,
    ineligibility_reasons=None,
    eligibility_reasons=None,
):
    lab_id = lab_id or uuid.uuid4()
    branch_id = branch_id or uuid.uuid4()
    lab = SimpleNamespace(pk=lab_id)
    branch = SimpleNamespace(pk=branch_id, branch_code="BR-001")
    return SimpleNamespace(
        lab=lab,
        branch=branch,
        estimated_price=Decimal(str(price)),
        estimated_tat_hours=tat_hours,
        distance_km=distance_km,
        ineligibility_reasons=ineligibility_reasons or ([] if eligible else ["outside_service_area"]),
        eligibility_reasons=eligibility_reasons or (["in_service_area"] if eligible else []),
        supports_home_collection=True,
        supports_all_tests=True,
        missing_tests=[],
    )


def ranked_stub(*, candidate=None, final_score=94.0, labels=None):
    candidate = candidate or candidate_stub()
    return SimpleNamespace(
        candidate=candidate,
        distance_score=Decimal("0.8"),
        price_score=Decimal("0.9"),
        tat_score=Decimal("0.7"),
        quality_score=Decimal("0.5"),
        partner_score=Decimal("0.5"),
        final_score=Decimal(str(final_score)),
        recommendation_labels=labels or ["recommended", "cheapest"],
    )


def routing_run_stub(*, order=None, engine_version="v1"):
    return SimpleNamespace(
        pk=uuid.uuid4(),
        routing_engine_version=engine_version,
        metadata={},
        diagnostic_order=order,
    )


def create_routing_run_for_order(order, *, engine_version="v1") -> RoutingRun:
    return RoutingRun.objects.create(
        diagnostic_order=order,
        encounter=order.encounter,
        consultation=order.consultation,
        routing_status=RoutingStatus.RUNNING,
        routing_engine_version=engine_version,
        requested_collection_mode=order.sample_collection_mode,
        metadata={},
    )


__all__ = [
    "setup_booking_context",
    "create_booking_order",
    "candidate_stub",
    "ranked_stub",
    "routing_run_stub",
    "create_routing_run_for_order",
]
