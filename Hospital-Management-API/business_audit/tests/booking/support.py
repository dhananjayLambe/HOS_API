"""Shared helpers for booking business audit tests."""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone

from clinic.models import Clinic
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.investigation import (
    ConsultationInvestigations,
    InvestigationItem,
    InvestigationSource,
    InvestigationStatus,
    InvestigationUrgency,
)
from consultations_core.services.encounter_service import EncounterService
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationService
from diagnostics_engine.models import DiagnosticCategory, DiagnosticServiceMaster
from diagnostics_engine.models.choices import OrderStatus
from doctor.models import doctor as DoctorProfile
from labs.models import (
    BranchServicePricing,
    LabAddress,
    LabBranch,
    LabOrganization,
    LabType,
    RegistrationStatus,
)
from patient_account.models import PatientAccount, PatientProfile
from shared.logging.context import LogContext, get_context_manager

User = get_user_model()


def setup_booking_context(*, recommendation_id: str | None = None, booking_id: str | None = None):
    recommendation_id = recommendation_id or str(uuid.uuid4())
    correlation_id = str(uuid.uuid4())
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    g, _ = Group.objects.get_or_create(name="doctor")
    doctor_user = User.objects.create_user(
        username=f"doc_bk_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    doctor_user.groups.add(g)
    doc = DoctorProfile.objects.create(user=doctor_user, primary_specialization="General")
    doc.clinics.add(clinic)

    patient_user = User.objects.create_user(
        username=f"pat_bk_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    account = PatientAccount.objects.create(user=patient_user)
    account.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=account,
        first_name="Pat",
        last_name="Booking",
        relation="self",
        gender="male",
        age_years=28,
    )
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=account,
        patient_profile=profile,
        doctor=doc,
        created_by=doctor_user,
    )
    ClinicalEncounter.objects.filter(pk=encounter.pk).update(status="consultation_in_progress")
    consultation = Consultation.objects.create(encounter=encounter)
    org, branch = _lab_org_and_branch()
    svc = _catalog_service()
    _branch_pricing(branch, svc)
    inv_item = _investigation_item(consultation, svc)
    get_context_manager().set(
        LogContext(
            correlation_id=correlation_id,
            parent_workflow_instance_id=recommendation_id,
            recommendation_id=recommendation_id,
            workflow_instance_id=booking_id,
        )
    )
    return {
        "clinic": clinic,
        "consultation": consultation,
        "encounter": encounter,
        "doctor_user": doctor_user,
        "doc": doc,
        "branch": branch,
        "org": org,
        "svc": svc,
        "inv_item": inv_item,
        "recommendation_id": recommendation_id,
        "correlation_id": correlation_id,
    }


def create_booking_order(ctx: dict):
    result = DiagnosticOrderCreationService.create_order_from_consultation(
        consultation=ctx["consultation"],
        branch=ctx["branch"],
        source="emr",
        created_by=ctx["doctor_user"],
    )
    result.order.refresh_from_db()
    return result.order


def _lab_org_and_branch():
    org = LabOrganization.objects.create(
        organization_name="Booking Org",
        display_name="Booking Org",
        organization_code=f"ORG-{uuid.uuid4().hex[:8]}",
        slug=f"booking-org-{uuid.uuid4().hex[:8]}",
        lab_type=LabType.PATHOLOGY_LAB,
        owner_name="Owner",
        primary_contact_number="9999999999",
        registration_status=RegistrationStatus.APPROVED,
        is_verified=True,
        onboarding_completed=True,
        is_active_for_orders=True,
    )
    branch = LabBranch.objects.create(
        organization=org,
        branch_name="Booking Branch",
        branch_code=f"BR-{uuid.uuid4().hex[:8]}",
        is_active=True,
        is_active_for_orders=True,
    )
    LabAddress.objects.create(
        branch=branch,
        address_line_1="1 Booking St",
        city="City",
        state="State",
        pincode="400001",
    )
    return org, branch


def _catalog_service():
    cat = DiagnosticCategory.objects.create(
        name=f"Cat {uuid.uuid4().hex[:6]}",
        code=f"C-{uuid.uuid4().hex[:6]}",
    )
    return DiagnosticServiceMaster.objects.create(
        code=f"svc_{uuid.uuid4().hex[:6]}",
        name="Booking Test",
        category=cat,
    )


def _branch_pricing(branch, svc, *, price=Decimal("850.00")):
    past = timezone.now().date() - timedelta(days=7)
    BranchServicePricing.objects.create(
        branch=branch,
        service=svc,
        selling_price=price,
        platform_margin_type="flat",
        platform_margin_value=Decimal("5"),
        doctor_commission_type="flat",
        doctor_commission_value=Decimal("2"),
        valid_from=past,
    )


def _investigation_item(consultation, svc):
    ci, _ = ConsultationInvestigations.objects.get_or_create(consultation=consultation)
    return InvestigationItem.objects.create(
        investigations=ci,
        source=InvestigationSource.CATALOG,
        catalog_item=svc,
        name=svc.name,
        investigation_type="lab",
        urgency=InvestigationUrgency.ROUTINE,
        status=InvestigationStatus.SUGGESTED,
        position=1,
    )


def order_stub(*, status=OrderStatus.CONFIRMED, collection_mode="lab", recommendation_id=None):
    """Lightweight order-like object for payload builder unit tests."""
    from types import SimpleNamespace

    encounter = SimpleNamespace(
        patient_account_id=uuid.uuid4(),
        clinic_id=uuid.uuid4(),
    )
    meta = {"recommendation_id": recommendation_id} if recommendation_id else {}
    return SimpleNamespace(
        pk=uuid.uuid4(),
        order_number="ORD-001",
        encounter=encounter,
        consultation_id=uuid.uuid4(),
        patient_profile_id=uuid.uuid4(),
        encounter_id=uuid.uuid4(),
        branch_id=uuid.uuid4(),
        branch=None,
        status=status,
        sample_collection_mode=collection_mode,
        final_amount=Decimal("850.00"),
        discount_amount=Decimal("120.00"),
        scheduled_at=None,
        operational_metadata=meta,
        visit_appointment=None,
        collection_request=None,
        cancelled_by_id=None,
    )
