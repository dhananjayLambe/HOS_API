"""
Routing catalog ↔ BranchServicePricing alignment (UUID-keyed pricing).

ORM enforces ``DiagnosticServiceMaster.code`` unique=True, so two rows cannot share the same
code. A realistic failure mode is two different codes (or legacy DB drift) with the same
display name: pricing is attached to the wrong ``DiagnosticServiceMaster.id`` and routing
reports ``missing_test_pricing`` even though admin labels look like the same test.
"""

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
from diagnostics_engine.models.routing import (
    EligibleLabSnapshot,
    RoutingDecisionSnapshot,
    RoutingLabOrderAssignment,
    RoutingRun,
)
from diagnostics_engine.services.routing.eligibility_engine import (
    ER_HAS_SERVICE_PRICING,
    IR_MISSING_TEST_PRICING,
    EligibilityEngine,
)
from diagnostics_engine.services.routing.routing_helpers import resolve_routing_location
from diagnostics_engine.tests.test_order_creation_service import _consultation_with_investigations
from diagnostics_engine.tests.test_routing_service import _branch_with_area_and_org
from doctor.models import doctor as DoctorProfile
from labs.models.branch_pricing import BranchServicePricing
from patient.models import patient as PatientRow
from patient_account.models import PatientProfile

User = get_user_model()


class RoutingCatalogPricingAlignmentTests(TestCase):
    """UUID-aligned pricing vs mis-linked pricing (strict catalog FK, not fuzzy labels)."""

    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(
            name="Cat Align", code=f"CAT-ALIGN-{uuid.uuid4().hex[:6]}"
        )
        cls.svc_cbc = DiagnosticServiceMaster.objects.create(
            code=f"LAB-CBC-ALIGN-{uuid.uuid4().hex[:6]}",
            name="CBC",
            category=cls.cat,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_align_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="Align Pkg",
            category=cls.cat,
        )
        _, cls.branch = _branch_with_area_and_org()
        past = timezone.now().date() - timedelta(days=7)
        BranchServicePricing.objects.create(
            branch=cls.branch,
            service=cls.svc_cbc,
            selling_price=Decimal("199.00"),
            platform_margin_type="flat",
            platform_margin_value=Decimal("5"),
            doctor_commission_type="flat",
            doctor_commission_value=Decimal("2"),
            valid_from=past,
        )

    def setUp(self):
        self.clinic = Clinic.objects.create(name=f"Align-Clinic-{uuid.uuid4().hex[:6]}")
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
            username=f"doc_align_{uuid.uuid4().hex[:10]}",
            password="testpass123",
            first_name="Doc",
            last_name="Align",
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

    def test_positive_same_service_uuid_pricing_eligible_and_snapshots(self):
        consultation, encounter, profile, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, svc=self.svc_cbc
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

        loc = resolve_routing_location(order)
        cand = next(c for c in EligibilityEngine.evaluate_all(order, loc) if c.branch_id == self.branch.pk)
        self.assertNotIn(IR_MISSING_TEST_PRICING, cand.ineligibility_reasons)
        self.assertIn(ER_HAS_SERVICE_PRICING, cand.eligibility_reasons)

        run = RoutingRun.objects.filter(diagnostic_order=order).order_by("-created_at").first()
        self.assertIsNotNone(run)
        self.assertEqual(run.routing_status, RoutingStatus.COMPLETED)
        self.assertTrue(EligibleLabSnapshot.objects.filter(routing_run=run, is_eligible=True).exists())
        self.assertTrue(RoutingDecisionSnapshot.objects.filter(routing_run=run).exists())
        assign = RoutingLabOrderAssignment.objects.get(diagnostic_order=order)
        self.assertEqual(assign.branch_id, self.branch.pk)

    def test_negative_pricing_on_different_catalog_uuid_same_display_name(self):
        """
        Two services cannot share ``code`` (unique). Simulate admin confusion with same *name*
        "CBC" but different codes: order references ``svc_order``; branch prices ``svc_stale``.
        """
        svc_order = DiagnosticServiceMaster.objects.create(
            code=f"LAB-CBC-ORDER-{uuid.uuid4().hex[:6]}",
            name="CBC",
            category=self.cat,
        )
        svc_stale = DiagnosticServiceMaster.objects.create(
            code=f"LAB-CBC-STALE-{uuid.uuid4().hex[:6]}",
            name="CBC",
            category=self.cat,
        )
        BranchServicePricing.objects.filter(branch=self.branch, service=self.svc_cbc).delete()
        past = timezone.now().date() - timedelta(days=7)
        BranchServicePricing.objects.create(
            branch=self.branch,
            service=svc_stale,
            selling_price=Decimal("150.00"),
            platform_margin_type="flat",
            platform_margin_value=Decimal("5"),
            doctor_commission_type="flat",
            doctor_commission_value=Decimal("2"),
            valid_from=past,
        )

        consultation, encounter, profile, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, svc=svc_order
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
        self.assertEqual(order.routing_status, DiagnosticOrderRoutingStatus.NO_MATCH_FOUND)

        loc = resolve_routing_location(order)
        cand = next(c for c in EligibilityEngine.evaluate_all(order, loc) if c.branch_id == self.branch.pk)
        self.assertIn(IR_MISSING_TEST_PRICING, cand.ineligibility_reasons)

        run = RoutingRun.objects.filter(diagnostic_order=order).order_by("-created_at").first()
        self.assertIsNotNone(run)
        rej = EligibleLabSnapshot.objects.filter(routing_run=run, is_eligible=False, branch_id=self.branch.pk)
        self.assertEqual(rej.count(), 1)
        self.assertIn(
            "missing_test_pricing",
            (rej.first().metadata or {}).get("ineligibility_reasons", []),
        )
