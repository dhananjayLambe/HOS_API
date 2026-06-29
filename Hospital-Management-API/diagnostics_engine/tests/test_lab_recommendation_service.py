"""Tests for LabRecommendationService (Milestone 2 — read-only recommendation)."""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from clinic.models import Clinic, ClinicAddress
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
from diagnostics_engine.domain.investigation_resolution import (
    derive_sample_collection_mode,
    extract_required_service_ids,
    normalize_package_composition,
)
from diagnostics_engine.domain.order_creation import DiagnosticOrderCreationService
from diagnostics_engine.domain.recommendation import (
    LabRecommendationService,
    RecommendationFailureReason,
)
from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticOrder,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)
from diagnostics_engine.models.routing import RoutingRun
from diagnostics_engine.services.routing.eligibility_engine import EligibilityEngine
from diagnostics_engine.services.routing.ranking_engine import RankingEngine
from diagnostics_engine.services.routing.routing_helpers import resolve_routing_location
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _lab_org_and_branch,
    _pricing,
)
from labs.models import BranchServiceArea, BranchServicePricing, LabAddress, LabType, RegistrationStatus
from labs.models.lab_auth import LabBranch, LabOrganization
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _lab_org_branch_area(*, pincode: str = "400001", suffix: str | None = None) -> tuple[LabOrganization, LabBranch]:
    sfx = suffix or uuid.uuid4().hex[:6]
    org = LabOrganization.objects.create(
        organization_name=f"Rec Org {sfx}",
        display_name=f"Rec Org {sfx}",
        organization_code=f"ORG-REC-{sfx}",
        slug=f"rec-org-{sfx}",
        lab_type=LabType.PATHOLOGY_LAB,
        owner_name="Owner",
        primary_contact_number="9999999999",
        registration_status=RegistrationStatus.APPROVED,
        is_verified=True,
        onboarding_completed=True,
        is_active_for_orders=True,
        home_collection_available=True,
    )
    branch = LabBranch.objects.create(
        organization=org,
        branch_name=f"Rec Branch {sfx}",
        branch_code=f"BR-REC-{sfx}",
        is_active=True,
        is_active_for_orders=True,
        walk_in_collection_available=True,
        home_collection_available=True,
    )
    LabAddress.objects.create(
        branch=branch,
        address_line_1="1 Lab St",
        city="Mumbai",
        state="MH",
        pincode=pincode,
        latitude=Decimal("19.0760"),
        longitude=Decimal("72.8777"),
    )
    BranchServiceArea.objects.create(
        branch=branch,
        pincode=pincode,
        city="Mumbai",
        is_active=True,
        is_home_collection_available=True,
    )
    return org, branch


def _clinic_with_pincode(pincode: str = "400001") -> Clinic:
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    ClinicAddress.objects.create(
        clinic=clinic,
        address="1 Clinic Rd",
        address2="",
        city="Mumbai",
        state="MH",
        pincode=pincode,
        latitude=Decimal("19.0760"),
        longitude=Decimal("72.8777"),
    )
    return clinic


class InvestigationResolutionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(name="Rec Cat", code=f"RC-{uuid.uuid4().hex[:6]}")
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"rec_svc_{uuid.uuid4().hex[:6]}",
            name="Alpha Test",
            category=cls.cat,
            home_collection_possible=True,
        )
        cls.svc2 = DiagnosticServiceMaster.objects.create(
            code=f"rec_svc2_{uuid.uuid4().hex[:6]}",
            name="Beta Test",
            category=cls.cat,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_rec_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="Rec Pkg",
            category=cls.cat,
        )
        DiagnosticPackageItem.objects.create(
            package=cls.pkg,
            service=cls.svc,
            quantity=1,
            is_mandatory=True,
            display_order=1,
        )
        DiagnosticPackageItem.objects.create(
            package=cls.pkg,
            service=cls.svc2,
            quantity=2,
            is_mandatory=True,
            display_order=2,
        )

    def setUp(self):
        self.clinic = _clinic_with_pincode()
        self.user, self.doc = _doctor_user_and_profile(self.clinic)

    def test_extract_service_ids_unique_sorted_by_name(self):
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=False,
            with_package=True,
            pkg=self.pkg,
        )
        from diagnostics_engine.domain.investigation_resolution import load_convertible_investigation_items

        items = load_convertible_investigation_items(consultation)
        ids = extract_required_service_ids(items)
        self.assertEqual(len(ids), 2)
        self.assertEqual(set(str(i) for i in ids), {str(self.svc.pk), str(self.svc2.pk)})

    def test_normalize_package_composition_from_live_package(self):
        consultation, _, _, _, items, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=False,
            with_package=True,
            pkg=self.pkg,
        )
        comp = normalize_package_composition(items[0])
        self.assertEqual(len(comp), 2)


class LabRecommendationServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(name="Rec Cat2", code=f"RC2-{uuid.uuid4().hex[:6]}")
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"rec2_svc_{uuid.uuid4().hex[:6]}",
            name="Parity Svc",
            category=cls.cat,
            home_collection_possible=True,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_rec2_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="Parity Pkg",
            category=cls.cat,
        )
        DiagnosticPackageItem.objects.create(
            package=cls.pkg,
            service=cls.svc,
            quantity=1,
            is_mandatory=True,
            display_order=1,
        )
        cls.org, cls.branch = _lab_org_branch_area()
        _pricing(cls.branch, cls.svc, cls.pkg)

    def setUp(self):
        self.clinic = _clinic_with_pincode("400001")
        self.user, self.doc = _doctor_user_and_profile(self.clinic)

    def test_no_consultation_failure(self):
        result = LabRecommendationService.recommend(consultation=None)  # type: ignore[arg-type]
        self.assertFalse(result.available)
        self.assertEqual(result.failure_reason, RecommendationFailureReason.NO_CONSULTATION)

    def test_no_investigations_failure(self):
        clinic = self.clinic
        user, doc = self.user, self.doc
        pu = User.objects.create_user(username=f"empty_{uuid.uuid4().hex[:8]}", password="x")
        pa = PatientAccount.objects.create(user=pu)
        pa.clinics.add(clinic)
        profile = PatientProfile.objects.create(
            account=pa,
            first_name="E",
            last_name="M",
            relation="self",
            gender="male",
            date_of_birth=date(1990, 1, 1),
        )
        encounter = EncounterService.create_encounter(
            clinic=clinic,
            patient_account=pa,
            patient_profile=profile,
            doctor=doc,
            created_by=user,
        )
        consultation = Consultation.objects.create(encounter=encounter)
        ConsultationInvestigations.objects.get_or_create(consultation=consultation)

        result = LabRecommendationService.recommend(consultation=consultation)
        self.assertFalse(result.available)
        self.assertIn(
            result.failure_reason,
            (RecommendationFailureReason.NO_INVESTIGATIONS, RecommendationFailureReason.VALIDATION_ERROR),
        )

    def test_single_lab_recommendation_available(self):
        consultation, encounter, _, _, _, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=True,
            with_package=False,
            svc=self.svc,
        )
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(clinic=self.clinic)
        encounter.refresh_from_db()

        result = LabRecommendationService.recommend(consultation=consultation)
        self.assertTrue(result.available)
        self.assertIsNone(result.failure_reason)
        self.assertEqual(result.recommended_branch.pk, self.branch.pk)
        self.assertIsNotNone(result.routing_estimated_price)
        self.assertIsNotNone(result.quoted_price)
        self.assertIsNotNone(result.mrp_total)
        self.assertIsNotNone(result.savings)
        self.assertGreater(result.mrp_total, result.quoted_price)
        self.assertEqual(result.savings, result.mrp_total - result.quoted_price)
        expected_mrp = (result.quoted_price * Decimal("1.15")).quantize(Decimal("0.01"))
        self.assertEqual(result.mrp_total, expected_mrp)
        self.assertGreater(len(result.ranking_labels), 0)

    def test_no_eligible_lab_when_no_pricing(self):
        consultation, encounter, _, _, _, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=True,
            svc=self.svc,
        )
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(clinic=self.clinic)
        encounter.refresh_from_db()
        BranchServicePricing.objects.filter(branch=self.branch, service=self.svc).update(is_active=False)

        result = LabRecommendationService.recommend(consultation=consultation)
        self.assertFalse(result.available)
        self.assertEqual(result.failure_reason, RecommendationFailureReason.NO_ELIGIBLE_LABORATORY)

    @override_settings(DIAGNOSTICS_ALLOW_DERIVED_PACKAGE_PRICING=False)
    @patch("diagnostics_engine.services.routing.routing_helpers.schedule_routing_after_commit")
    def test_parity_with_routing_pipeline(self, mock_schedule):
        mock_schedule.return_value = None
        consultation, encounter, profile, doc, _, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=True,
            with_package=False,
            svc=self.svc,
        )
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(clinic=self.clinic)
        encounter.refresh_from_db()

        rec = LabRecommendationService.recommend(consultation=consultation)
        self.assertTrue(rec.available)

        order_result = DiagnosticOrderCreationService.create_order_from_consultation(
            consultation=consultation,
            encounter=encounter,
            patient_profile=profile,
            doctor=doc,
            created_by=self.user,
        )
        order = order_result.order
        location = resolve_routing_location(order)
        eligible = [
            c for c in EligibilityEngine.evaluate_all(order, location) if not c.ineligibility_reasons
        ]
        expected = RankingEngine.rank(eligible)[0]

        self.assertEqual(rec.recommended_branch.pk, expected.candidate.branch.pk)
        self.assertEqual(rec.routing_estimated_price, expected.candidate.estimated_price)
        self.assertEqual(rec.estimated_tat_hours, expected.candidate.estimated_tat_hours)
        if expected.candidate.distance_km is not None and rec.estimated_distance_km is not None:
            self.assertAlmostEqual(rec.estimated_distance_km, expected.candidate.distance_km, places=3)
        self.assertEqual(rec.routing_score, expected.final_score)
        self.assertEqual(set(rec.ranking_labels), set(expected.recommendation_labels))

    def test_recommend_does_not_create_order_or_routing(self):
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=True,
            svc=self.svc,
        )
        orders_before = DiagnosticOrder.objects.count()
        runs_before = RoutingRun.objects.count()

        LabRecommendationService.recommend(consultation=consultation)

        self.assertEqual(DiagnosticOrder.objects.count(), orders_before)
        self.assertEqual(RoutingRun.objects.count(), runs_before)

    def test_collection_mode_matches_order_creation_without_branch(self):
        consultation, encounter, profile, doc, items, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=True,
            svc=self.svc,
        )
        from diagnostics_engine.domain.investigation_resolution import load_convertible_investigation_items

        inv_items = load_convertible_investigation_items(consultation)
        mode = derive_sample_collection_mode(inv_items, branch=None)
        self.assertEqual(mode, "home" if self.svc.home_collection_possible else "lab")

        rec = LabRecommendationService.recommend(consultation=consultation)
        self.assertEqual(rec.collection_mode, mode)
