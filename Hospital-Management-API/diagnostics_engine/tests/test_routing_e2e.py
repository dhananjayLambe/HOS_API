"""
End-to-end routing integration tests: seed DB with valid / invalid lab data,
create diagnostic orders, flush on_commit hooks, assert routing tables + API.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from clinic.models import Clinic, ClinicAddress
from consultations_core.models.encounter import ClinicalEncounter
from diagnostics_engine.choices.routing import (
    DiagnosticOrderRoutingStatus,
    RecommendationLabel,
    RoutingEventType,
    RoutingStatus,
)
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationService
from diagnostics_engine.models import DiagnosticCategory, DiagnosticPackage, DiagnosticServiceMaster
from diagnostics_engine.models.routing import (
    EligibleLabSnapshot,
    RoutingDecisionSnapshot,
    RoutingEvent,
    RoutingLabOrderAssignment,
    RoutingRun,
)
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _pricing,
)
from doctor.models import doctor as DoctorProfile
from labs.models import BranchServiceArea, LabType, RegistrationStatus
from labs.models.branch_pricing import BranchPackagePricing, BranchServicePricing
from labs.models.lab_auth import LabAddress, LabBranch, LabOrganization
from patient_account.models import PatientAddress, PatientProfile

User = get_user_model()


def _lab_org_branch_area(
    *,
    pincode: str,
    branch_code_suffix: str,
    org_onboarding: bool = True,
    area_city: str = "Mumbai",
) -> tuple[LabOrganization, LabBranch]:
    org = LabOrganization.objects.create(
        organization_name=f"E2E Org {branch_code_suffix}",
        display_name=f"E2E Org {branch_code_suffix}",
        organization_code=f"ORG-E2E-{branch_code_suffix}-{uuid.uuid4().hex[:6]}",
        slug=f"e2e-org-{branch_code_suffix}-{uuid.uuid4().hex[:6]}",
        lab_type=LabType.PATHOLOGY_LAB,
        owner_name="Owner",
        primary_contact_number="9999999999",
        registration_status=RegistrationStatus.APPROVED,
        is_verified=True,
        onboarding_completed=org_onboarding,
        is_active_for_orders=True,
    )
    branch = LabBranch.objects.create(
        organization=org,
        branch_name=f"Branch {branch_code_suffix}",
        branch_code=f"BR-E2E-{branch_code_suffix}-{uuid.uuid4().hex[:6]}",
        is_active=True,
        is_active_for_orders=True,
        walk_in_collection_available=True,
        home_collection_available=True,
    )
    LabAddress.objects.create(
        branch=branch,
        address_line_1="Lab St",
        city="Mumbai",
        state="MH",
        pincode=pincode,
        latitude=Decimal("19.0760"),
        longitude=Decimal("72.8777"),
    )
    BranchServiceArea.objects.create(
        branch=branch,
        pincode=pincode,
        city=area_city,
        state="MH",
        is_active=True,
        is_home_collection_available=True,
    )
    return org, branch


def _add_pricing(branch: LabBranch, svc: DiagnosticServiceMaster, pkg: DiagnosticPackage) -> None:
    past = timezone.now().date() - timedelta(days=7)
    _pricing(branch, svc, pkg, svc_price=Decimal("60.00"), pkg_price=Decimal("110.00"))
    BranchServicePricing.objects.filter(branch=branch, service=svc).update(valid_from=past)


class DiagnosticRoutingE2ETests(TestCase):
    """Service-layer E2E: order creation → on_commit → routing persistence."""

    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(name="Cat E2E", code=f"CAT-E2E-{uuid.uuid4().hex[:6]}")
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"svc_e2e_{uuid.uuid4().hex[:6]}",
            name="E2E Svc",
            category=cls.cat,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_e2e_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="E2E Pkg",
            category=cls.cat,
        )

    def setUp(self):
        self.clinic = Clinic.objects.create(name=f"E2E-Clinic-{uuid.uuid4().hex[:6]}")
        ClinicAddress.objects.create(
            clinic=self.clinic,
            address="Clinic Rd",
            address2="",
            city="Mumbai",
            state="MH",
            pincode="400001",
            latitude=Decimal("19.0760"),
            longitude=Decimal("72.8777"),
        )
        self.user = User.objects.create_user(
            username=f"doc_e2e_{uuid.uuid4().hex[:10]}",
            password="testpass123",
            first_name="Doc",
            last_name="E2E",
        )
        self.doc_profile = DoctorProfile.objects.create(user=self.user, primary_specialization="General")
        self.doc_profile.clinics.add(self.clinic)

    def _patient_address(
        self, profile: PatientProfile, *, pincode: str | None = "400001", street: str = "Home"
    ) -> PatientAddress:
        return PatientAddress.objects.create(
            account=profile.account,
            address_type=PatientAddress.HOME,
            street=street,
            city="Mumbai",
            state="MH",
            pincode=pincode,
            country="India",
        )

    def _consultation_on_clinic(self, *, with_catalog: bool = True):
        consultation, encounter, profile, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=with_catalog, svc=self.svc
        )
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(clinic=self.clinic)
        encounter.refresh_from_db()
        consultation.refresh_from_db()
        return consultation, encounter, profile

    def test_e2e_valid_routing_creates_run_snapshots_assignment_events(self):
        _, branch = _lab_org_branch_area(pincode="400001", branch_code_suffix="A")
        _add_pricing(branch, self.svc, self.pkg)

        consultation, _, profile = self._consultation_on_clinic()
        self._patient_address(profile, pincode="400001")

        with self.captureOnCommitCallbacks(execute=True):
            r = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=branch,
                created_by=self.user,
            )
        order = r.order
        order.refresh_from_db()
        self.assertEqual(order.routing_status, DiagnosticOrderRoutingStatus.ASSIGNED)
        self.assertEqual(order.branch_id, branch.id)

        run = RoutingRun.objects.filter(diagnostic_order=order).order_by("-created_at").first()
        self.assertIsNotNone(run)
        self.assertEqual(run.routing_status, RoutingStatus.COMPLETED)
        self.assertEqual(run.routing_engine_version, "v1")
        self.assertEqual(run.patient_profile_id, profile.id)

        self.assertGreaterEqual(EligibleLabSnapshot.objects.filter(routing_run=run, is_eligible=True).count(), 1)
        self.assertTrue(RoutingLabOrderAssignment.objects.filter(diagnostic_order=order).exists())
        assign = RoutingLabOrderAssignment.objects.get(diagnostic_order=order)
        self.assertEqual(assign.branch_id, branch.id)
        self.assertEqual(assign.patient_profile_id, profile.id)

        types = list(RoutingEvent.objects.filter(routing_run=run).values_list("event_type", flat=True))
        self.assertIn(RoutingEventType.ROUTING_STARTED, types)
        self.assertIn(RoutingEventType.ROUTING_COMPLETED, types)

    def test_e2e_no_match_outside_service_area(self):
        # Lab serves 400001 only; clinic pin resolves to 560001 with no patient pincode.
        # Use a non-clinic city on the service area so city-level fallback does not match Mumbai.
        _, branch = _lab_org_branch_area(pincode="400001", branch_code_suffix="B", area_city="Pune")
        _add_pricing(branch, self.svc, self.pkg)

        self.clinic.address.pincode = "560001"
        self.clinic.address.save(update_fields=["pincode"])

        consultation, _, profile = self._consultation_on_clinic()
        self._patient_address(profile, pincode=None, street="No six digit pincode in this text")

        with self.captureOnCommitCallbacks(execute=True):
            r = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=branch,
                created_by=self.user,
            )
        order = r.order
        order.refresh_from_db()
        self.assertEqual(order.routing_status, DiagnosticOrderRoutingStatus.NO_MATCH_FOUND)

        run = RoutingRun.objects.filter(diagnostic_order=order).order_by("-created_at").first()
        self.assertIsNotNone(run)
        self.assertEqual(run.routing_status, RoutingStatus.NO_MATCH_FOUND)
        self.assertEqual(RoutingLabOrderAssignment.objects.filter(diagnostic_order=order).count(), 0)
        ev = RoutingEvent.objects.filter(routing_run=run, event_type=RoutingEventType.NO_ELIGIBLE_LABS)
        self.assertTrue(ev.exists())
        rej = EligibleLabSnapshot.objects.filter(routing_run=run, is_eligible=False)
        self.assertGreaterEqual(rej.count(), 1)
        self.assertTrue(
            any("outside_service_area" in (s.metadata or {}).get("ineligibility_reasons", []) for s in rej)
        )
        self.assertIsNotNone((run.metadata or {}).get("no_match_summary"))

    def test_e2e_no_match_missing_branch_service_pricing(self):
        _, branch = _lab_org_branch_area(pincode="400001", branch_code_suffix="C")
        _add_pricing(branch, self.svc, self.pkg)

        consultation, _, profile = self._consultation_on_clinic()
        self._patient_address(profile, pincode="400001")

        with self.captureOnCommitCallbacks(execute=True):
            r = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=branch,
                created_by=self.user,
            )
            BranchServicePricing.objects.filter(branch=branch, service=self.svc).delete()
            BranchPackagePricing.objects.filter(branch=branch, package=self.pkg).delete()

        order = r.order
        order.refresh_from_db()
        self.assertEqual(order.routing_status, DiagnosticOrderRoutingStatus.NO_MATCH_FOUND)
        self.assertFalse(RoutingLabOrderAssignment.objects.filter(diagnostic_order=order).exists())
        run = RoutingRun.objects.filter(diagnostic_order=order).order_by("-created_at").first()
        self.assertIsNotNone(run)
        rej = EligibleLabSnapshot.objects.filter(routing_run=run, is_eligible=False, branch_id=branch.id)
        self.assertEqual(rej.count(), 1)
        self.assertIn(
            "missing_test_pricing",
            (rej.first().metadata or {}).get("ineligibility_reasons", []),
        )

    def test_e2e_org_not_onboarded_branch_never_considered(self):
        _, branch_bad = _lab_org_branch_area(pincode="400001", branch_code_suffix="D", org_onboarding=False)
        _add_pricing(branch_bad, self.svc, self.pkg)

        _, branch_good = _lab_org_branch_area(pincode="400001", branch_code_suffix="E")
        _add_pricing(branch_good, self.svc, self.pkg)

        consultation, _, profile = self._consultation_on_clinic()
        self._patient_address(profile, pincode="400001")

        with self.captureOnCommitCallbacks(execute=True):
            r = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=branch_good,
                created_by=self.user,
            )
        order = r.order
        order.refresh_from_db()
        self.assertEqual(order.routing_status, DiagnosticOrderRoutingStatus.ASSIGNED)
        assign = RoutingLabOrderAssignment.objects.get(diagnostic_order=order)
        self.assertEqual(assign.branch_id, branch_good.id)
        self.assertNotEqual(assign.branch_id, branch_bad.id)

    def test_e2e_two_eligible_branches_snapshots_ranked(self):
        _, b1 = _lab_org_branch_area(pincode="400001", branch_code_suffix="F1")
        _, b2 = _lab_org_branch_area(pincode="400001", branch_code_suffix="F2")
        _add_pricing(b1, self.svc, self.pkg)
        _add_pricing(b2, self.svc, self.pkg)
        BranchServicePricing.objects.filter(branch=b2, service=self.svc).update(selling_price=Decimal("35.00"))

        consultation, _, profile = self._consultation_on_clinic()
        self._patient_address(profile, pincode="400001")

        with self.captureOnCommitCallbacks(execute=True):
            r = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=b1,
                created_by=self.user,
            )
        order = r.order
        run = RoutingRun.objects.get(diagnostic_order=order)
        snaps = list(
            EligibleLabSnapshot.objects.filter(routing_run=run, is_eligible=True).order_by("ranking_position")
        )
        self.assertEqual(len(snaps), 2)
        winner_id = RoutingLabOrderAssignment.objects.get(diagnostic_order=order).branch_id
        self.assertIn(winner_id, {b1.id, b2.id})

    @override_settings(
        DIAGNOSTICS_ROUTING_SCORING_WEIGHTS={
            "distance": 0.02,
            "price": 0.95,
            "tat": 0.02,
            "quality": 0.005,
            "partner": 0.005,
        }
    )
    def test_e2e_price_weighted_routing_prefers_lower_pricing_branch(self):
        """Same TAT; heavy price weight → cheaper branch wins and carries CHEAPEST label."""
        _, b_cheap = _lab_org_branch_area(pincode="400001", branch_code_suffix="PC")
        _, b_fast = _lab_org_branch_area(pincode="400001", branch_code_suffix="PF")
        _add_pricing(b_cheap, self.svc, self.pkg)
        _add_pricing(b_fast, self.svc, self.pkg)
        BranchServicePricing.objects.filter(branch=b_cheap, service=self.svc).update(
            selling_price=Decimal("40.00"),
            report_delivery_hours=24,
        )
        BranchServicePricing.objects.filter(branch=b_fast, service=self.svc).update(
            selling_price=Decimal("400.00"),
            report_delivery_hours=24,
        )

        consultation, _, profile = self._consultation_on_clinic()
        self._patient_address(profile, pincode="400001")

        with self.captureOnCommitCallbacks(execute=True):
            r = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=b_cheap,
                created_by=self.user,
            )
        order = r.order
        assign = RoutingLabOrderAssignment.objects.get(diagnostic_order=order)
        self.assertEqual(assign.branch_id, b_cheap.id)

        run = RoutingRun.objects.get(diagnostic_order=order)
        dec = RoutingDecisionSnapshot.objects.get(routing_run=run, eligible_lab_snapshot__branch=b_cheap)
        self.assertIn(RecommendationLabel.CHEAPEST, dec.recommendation_labels)

    @override_settings(
        DIAGNOSTICS_ROUTING_SCORING_WEIGHTS={
            "distance": 0.02,
            "price": 0.02,
            "tat": 0.95,
            "quality": 0.005,
            "partner": 0.005,
        }
    )
    def test_e2e_tat_weighted_routing_prefers_lower_tat_branch(self):
        """Same selling price; heavy TAT weight → faster report_delivery_hours wins."""
        _, b_slow = _lab_org_branch_area(pincode="400001", branch_code_suffix="TS")
        _, b_fast = _lab_org_branch_area(pincode="400001", branch_code_suffix="TF")
        _add_pricing(b_slow, self.svc, self.pkg)
        _add_pricing(b_fast, self.svc, self.pkg)
        BranchServicePricing.objects.filter(branch=b_slow, service=self.svc).update(
            selling_price=Decimal("100.00"),
            report_delivery_hours=72,
        )
        BranchServicePricing.objects.filter(branch=b_fast, service=self.svc).update(
            selling_price=Decimal("100.00"),
            report_delivery_hours=6,
        )

        consultation, _, profile = self._consultation_on_clinic()
        self._patient_address(profile, pincode="400001")

        with self.captureOnCommitCallbacks(execute=True):
            r = DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation,
                branch=b_slow,
                created_by=self.user,
            )
        order = r.order
        assign = RoutingLabOrderAssignment.objects.get(diagnostic_order=order)
        self.assertEqual(assign.branch_id, b_fast.id)

        run = RoutingRun.objects.get(diagnostic_order=order)
        dec = RoutingDecisionSnapshot.objects.get(routing_run=run, eligible_lab_snapshot__branch=b_fast)
        self.assertIn(RecommendationLabel.FASTEST, dec.recommendation_labels)


class DiagnosticRoutingAPIE2ETests(TestCase):
    """HTTP E2E: create-from-consultation + routing summary GET."""

    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(name="Cat APIE2E", code=f"CAT-AE2E-{uuid.uuid4().hex[:6]}")
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"svc_ae2e_{uuid.uuid4().hex[:6]}",
            name="API E2E Svc",
            category=cls.cat,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_ae2e_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="API E2E Pkg",
            category=cls.cat,
        )

    def setUp(self):
        self.clinic = Clinic.objects.create(name=f"APIE2E-{uuid.uuid4().hex[:6]}")
        ClinicAddress.objects.create(
            clinic=self.clinic,
            address="Clinic",
            address2="",
            city="Mumbai",
            state="MH",
            pincode="400001",
        )
        g, _ = Group.objects.get_or_create(name="doctor")
        self.user, self.doc_profile = _doctor_user_and_profile(self.clinic)
        self.user.groups.add(g)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        _, branch = _lab_org_branch_area(pincode="400001", branch_code_suffix="API")
        _add_pricing(branch, self.svc, self.pkg)
        self.branch = branch

        self.consultation, enc, self.profile, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, svc=self.svc
        )
        ClinicalEncounter.objects.filter(pk=enc.pk).update(clinic=self.clinic)
        self._patient_address(self.profile, pincode="400001")

    def _patient_address(
        self, profile: PatientProfile, *, pincode: str | None = "400001", street: str = "Home"
    ) -> PatientAddress:
        return PatientAddress.objects.create(
            account=profile.account,
            address_type=PatientAddress.HOME,
            street=street,
            city="Mumbai",
            state="MH",
            pincode=pincode,
            country="India",
        )

    def test_api_create_order_then_routing_summary(self):
        url_create = reverse("diagnostic-order-create-from-consultation")
        with self.captureOnCommitCallbacks(execute=True):
            resp = self.client.post(
                url_create,
                {"consultation_id": str(self.consultation.id), "branch_id": str(self.branch.id)},
                format="json",
            )
        self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
        order_id = resp.data["order_id"]

        url_routing = reverse("diagnostic-order-routing-summary", kwargs={"order_id": order_id})
        r2 = self.client.get(url_routing)
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["order_routing_status"], DiagnosticOrderRoutingStatus.ASSIGNED)
        self.assertIsNotNone(r2.data.get("selected_branch"))
        self.assertGreaterEqual(len(r2.data.get("eligible_branches") or []), 1)
        self.assertEqual(r2.data["selected_branch"]["branch_id"], str(self.branch.id))
