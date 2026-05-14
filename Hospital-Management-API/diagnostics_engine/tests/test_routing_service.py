"""Routing orchestration: eligibility, ranking, snapshots, assignment."""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from clinic.models import Clinic, ClinicAddress
from consultations_core.models.encounter import ClinicalEncounter
from diagnostics_engine.choices.routing import DiagnosticOrderRoutingStatus, RoutingStatus
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationService
from diagnostics_engine.models import DiagnosticCategory, DiagnosticPackage, DiagnosticServiceMaster
from diagnostics_engine.models.routing import RoutingLabOrderAssignment, RoutingRun
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _pricing,
)
from doctor.models import doctor as DoctorProfile
from labs.models import BranchServiceArea, LabType, RegistrationStatus
from labs.models.branch_pricing import BranchServicePricing
from labs.models.lab_auth import LabAddress, LabBranch, LabOrganization
from patient.models import patient as PatientRow
from patient_account.models import PatientProfile

User = get_user_model()


def _branch_with_area_and_org():
    org = LabOrganization.objects.create(
        organization_name="RT Org",
        display_name="RT Org",
        organization_code=f"ORG-RT-{uuid.uuid4().hex[:8]}",
        slug=f"rt-org-{uuid.uuid4().hex[:8]}",
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
        branch_name="RT Branch",
        branch_code=f"BR-RT-{uuid.uuid4().hex[:8]}",
        is_active=True,
        is_active_for_orders=True,
        walk_in_collection_available=True,
        home_collection_available=True,
    )
    LabAddress.objects.create(
        branch=branch,
        address_line_1="Lab St",
        city="City",
        state="State",
        pincode="400001",
        latitude=Decimal("19.0760"),
        longitude=Decimal("72.8777"),
    )
    BranchServiceArea.objects.create(
        branch=branch,
        pincode="400001",
        city="City",
        state="State",
        is_active=True,
        is_home_collection_available=True,
    )
    return org, branch


class RoutingServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(name="Cat RT", code=f"CAT-RT-{uuid.uuid4().hex[:6]}")
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"svc_rt_{uuid.uuid4().hex[:6]}",
            name="Routing Svc",
            category=cls.cat,
        )
        _, cls.branch = _branch_with_area_and_org()
        past = timezone.now().date() - timedelta(days=7)

        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_rt_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="RT Pkg",
            category=cls.cat,
        )
        _pricing(cls.branch, cls.svc, cls.pkg, svc_price=Decimal("55.00"), pkg_price=Decimal("100.00"))
        BranchServicePricing.objects.filter(branch=cls.branch, service=cls.svc).update(valid_from=past)

    def setUp(self):
        self.clinic = Clinic.objects.create(name=f"RT-Clinic-{uuid.uuid4().hex[:6]}")
        ClinicAddress.objects.create(
            clinic=self.clinic,
            address="Clinic Rd",
            address2="",
            city="City",
            state="State",
            pincode="400001",
            latitude=Decimal("19.0760"),
            longitude=Decimal("72.8777"),
        )
        self.user = User.objects.create_user(
            username=f"doc_rt_{uuid.uuid4().hex[:10]}",
            password="testpass123",
            first_name="Doc",
            last_name="RT",
        )
        self.doc_profile = DoctorProfile.objects.create(user=self.user, primary_specialization="General")
        self.doc_profile.clinics.add(self.clinic)

    def _patient_row_for_profile(self, profile: PatientProfile) -> PatientRow:
        return PatientRow.objects.create(
            user=profile.account.user,
            age=Decimal("30.0"),
            address="Home 400001 Mumbai",
            mobile="9999999998",
        )

    def test_routing_creates_run_assignment_and_order_status(self):
        consultation, encounter, profile, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, svc=self.svc
        )
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(clinic=self.clinic)
        encounter.refresh_from_db()
        consultation.refresh_from_db()
        self._patient_row_for_profile(profile)

        with self.captureOnCommitCallbacks(execute=True):
            r = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=self.branch,
                created_by=self.user,
            )
        order = r.order
        order.refresh_from_db()
        self.assertEqual(order.routing_status, DiagnosticOrderRoutingStatus.ASSIGNED)

        assign = RoutingLabOrderAssignment.objects.get(diagnostic_order=order)
        self.assertEqual(order.branch_id, assign.branch_id)

        run = RoutingRun.objects.filter(diagnostic_order=order).order_by("-created_at").first()
        self.assertIsNotNone(run)
        self.assertEqual(run.routing_status, RoutingStatus.COMPLETED)
        self.assertEqual(run.routing_engine_version, "v1")

        self.assertTrue(RoutingLabOrderAssignment.objects.filter(diagnostic_order=order).exists())

    def test_routing_second_call_is_idempotent(self):
        consultation, encounter, profile, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, svc=self.svc
        )
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(clinic=self.clinic)
        encounter.refresh_from_db()
        self._patient_row_for_profile(profile)

        with self.captureOnCommitCallbacks(execute=True):
            r = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=self.branch,
                created_by=self.user,
            )
        order = r.order
        n1 = RoutingRun.objects.filter(diagnostic_order=order).count()
        with self.captureOnCommitCallbacks(execute=True):
            r2 = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=self.branch,
                created_by=self.user,
            )
        self.assertEqual(r.order.pk, r2.order.pk)
        self.assertTrue(r2.idempotent)
        n2 = RoutingRun.objects.filter(diagnostic_order=order).count()
        self.assertEqual(n1, n2)
        self.assertEqual(n1, 1)
