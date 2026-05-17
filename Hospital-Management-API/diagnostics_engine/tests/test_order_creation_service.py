"""Tests for DiagnosticOrderCreationService and create-from-consultation API."""

from __future__ import annotations

import threading
import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

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
from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticOrder,
    DiagnosticOrderTestLine,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)
from diagnostics_engine.models.choices import OrderLineType, OrderStatus
from doctor.models import doctor as DoctorProfile
from labs.models import (
    BranchPackagePricing,
    BranchServicePricing,
    LabAddress,
    LabBranch,
    LabOrganization,
    LabType,
    RegistrationStatus,
)
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _lab_org_and_branch():
    org = LabOrganization.objects.create(
        organization_name="Test Org",
        display_name="Test Org",
        organization_code=f"ORG-{uuid.uuid4().hex[:8]}",
        slug=f"test-org-{uuid.uuid4().hex[:8]}",
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
        branch_name="Main",
        branch_code=f"BR-{uuid.uuid4().hex[:8]}",
        is_active=True,
        is_active_for_orders=True,
    )
    LabAddress.objects.create(
        branch=branch,
        address_line_1="1 Test St",
        city="City",
        state="State",
        pincode="400001",
    )
    return org, branch


def _pricing(branch, svc, pkg, *, svc_price=Decimal("50.00"), pkg_price=Decimal("120.00")):
    past = timezone.now().date() - timedelta(days=7)
    BranchServicePricing.objects.create(
        branch=branch,
        service=svc,
        selling_price=svc_price,
        platform_margin_type="flat",
        platform_margin_value=Decimal("5"),
        doctor_commission_type="flat",
        doctor_commission_value=Decimal("2"),
        valid_from=past,
    )
    BranchPackagePricing.objects.create(
        branch=branch,
        package=pkg,
        mrp=150,
        selling_price=pkg_price,
        platform_margin_type="flat",
        platform_margin_value=Decimal("10"),
        doctor_commission_type="flat",
        doctor_commission_value=Decimal("3"),
        valid_from=past,
    )


def _doctor_user_and_profile(clinic: Clinic):
    u = User.objects.create_user(
        username=f"doc_ord_{uuid.uuid4().hex[:10]}",
        password="testpass123",
        first_name="Doc",
        last_name="Test",
    )
    dp = DoctorProfile.objects.create(user=u, primary_specialization="General")
    dp.clinics.add(clinic)
    return u, dp


def _create_catalog_service(*, name: str = "Test Svc"):
    """Create a real DiagnosticServiceMaster row for investigation FK integrity."""
    cat = DiagnosticCategory.objects.create(
        name=f"Cat {uuid.uuid4().hex[:6]}",
        code=f"C-{uuid.uuid4().hex[:6]}",
    )
    return DiagnosticServiceMaster.objects.create(
        code=f"svc_{uuid.uuid4().hex[:6]}",
        name=name,
        category=cat,
    )


def _consultation_with_investigations(doctor_user, doctor_profile, *, with_catalog=True, with_package=False, pkg=None, svc=None):
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    pu = User.objects.create_user(
        username=f"pat_ord_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    pa = PatientAccount.objects.create(user=pu)
    pa.clinics.add(clinic)
    profile = PatientProfile.objects.create(
        account=pa,
        first_name="Pat",
        last_name="Test",
        relation="self",
        gender="male",
        date_of_birth=date(1994, 6, 15),
    )
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=pa,
        patient_profile=profile,
        doctor=doctor_profile,
        created_by=doctor_user,
    )
    ClinicalEncounter.objects.filter(pk=encounter.pk).update(status="consultation_in_progress")
    consultation = Consultation.objects.create(encounter=encounter)
    ci, _ = ConsultationInvestigations.objects.get_or_create(consultation=consultation)
    items = []
    if with_catalog:
        catalog_svc = svc if svc is not None else _create_catalog_service()
        items.append(
            InvestigationItem.objects.create(
                investigations=ci,
                source=InvestigationSource.CATALOG,
                catalog_item=catalog_svc,
                name=catalog_svc.name,
                investigation_type="lab",
                urgency=InvestigationUrgency.ROUTINE,
                status=InvestigationStatus.SUGGESTED,
                position=1,
            )
        )
    if with_package and pkg:
        items.append(
            InvestigationItem.objects.create(
                investigations=ci,
                source=InvestigationSource.PACKAGE,
                diagnostic_package=pkg,
                name=pkg.name,
                investigation_type="package",
                urgency=InvestigationUrgency.ROUTINE,
                status=InvestigationStatus.SUGGESTED,
                position=len(items) + 1,
            )
        )
    return consultation, encounter, profile, doctor_profile, items, clinic


class DiagnosticOrderCreationServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(name="Cat OC", code=f"CAT-OC-{uuid.uuid4().hex[:6]}")
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"svc_oc_{uuid.uuid4().hex[:6]}",
            name="Order Creation Svc",
            category=cls.cat,
        )
        cls.svc2 = DiagnosticServiceMaster.objects.create(
            code=f"svc2_oc_{uuid.uuid4().hex[:6]}",
            name="Second Svc",
            category=cls.cat,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_oc_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="Order Pkg",
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
        _, cls.branch = _lab_org_and_branch()
        _pricing(cls.branch, cls.svc, cls.pkg)

    def setUp(self):
        self.user, self.doc_profile = _doctor_user_and_profile(Clinic.objects.create(name=f"C-{uuid.uuid4().hex[:4]}"))

    def test_creates_order_items_links_and_test_lines(self):
        consultation, encounter, profile, doc, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, with_package=True, pkg=self.pkg, svc=self.svc
        )
        r = DiagnosticOrderCreationService.create_order_from_consultation(
            consultation=consultation,
            branch=self.branch,
            created_by=self.user,
        )
        self.assertFalse(r.idempotent)
        self.assertEqual(r.items_created, 2)
        self.assertEqual(r.test_lines_created, 4)
        order = r.order
        self.assertEqual(order.status, OrderStatus.CONFIRMED)
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(order.test_lines.count(), 4)
        self.assertEqual(Decimal(order.final_amount), Decimal("170.00"))
        invs = InvestigationItem.objects.filter(investigations__consultation=consultation)
        for inv in invs:
            self.assertIsNotNone(inv.diagnostic_order_item_id)

    def test_idempotent_second_call(self):
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, svc=self.svc
        )
        r1 = DiagnosticOrderCreationService.create_order_from_consultation(
            consultation=consultation, branch=self.branch, created_by=self.user
        )
        r2 = DiagnosticOrderCreationService.create_order_from_consultation(
            consultation=consultation, branch=self.branch, created_by=self.user
        )
        self.assertEqual(r1.order.id, r2.order.id)
        self.assertTrue(r2.idempotent)
        self.assertEqual(DiagnosticOrder.objects.filter(consultation=consultation).count(), 1)

    def test_null_branch_zero_pricing(self):
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, svc=self.svc
        )
        r = DiagnosticOrderCreationService.create_order_from_consultation(
            consultation=consultation,
            branch=None,
            created_by=self.user,
        )
        self.assertIsNone(r.order.branch_id)
        self.assertEqual(Decimal(r.order.final_amount), Decimal("0.00"))
        line = r.order.items.first()
        self.assertTrue(line.metadata_snapshot.get("pricing_pending_branch"))

    def test_custom_investigation_rejected(self):
        consultation, _, _, _, _, clinic = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=False, svc=self.svc
        )
        ci = ConsultationInvestigations.objects.get(consultation=consultation)
        InvestigationItem.objects.create(
            investigations=ci,
            source=InvestigationSource.CUSTOM,
            name="Free text",
            investigation_type="other",
            urgency=InvestigationUrgency.ROUTINE,
            status=InvestigationStatus.SUGGESTED,
            position=1,
            is_custom=True,
        )
        with self.assertRaises(ValidationError):
            DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation, branch=self.branch, created_by=self.user
            )

    def test_no_investigations_raises(self):
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=False, svc=self.svc
        )
        with self.assertRaises(ValidationError):
            DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation, branch=self.branch, created_by=self.user
            )

    def test_package_snapshot_respects_included_false(self):
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=False, with_package=True, pkg=self.pkg, svc=self.svc
        )
        inv = InvestigationItem.objects.get(diagnostic_package=self.pkg)
        inv.package_expansion_snapshot = [
            {"service_id": str(self.svc.id), "included": True, "quantity": 1, "display_order": 1},
            {"service_id": str(self.svc2.id), "included": False, "quantity": 2, "display_order": 2},
        ]
        inv.save()
        r = DiagnosticOrderCreationService.create_order_from_consultation(
            consultation=consultation, branch=self.branch, created_by=self.user
        )
        pkg_line = r.order.items.get(line_type=OrderLineType.PACKAGE)
        self.assertEqual(len(pkg_line.composition_snapshot or []), 1)
        self.assertEqual(r.test_lines_created, 1)

    def test_invalid_snapshot_service_raises(self):
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=False, with_package=True, pkg=self.pkg, svc=self.svc
        )
        inv = InvestigationItem.objects.get(diagnostic_package=self.pkg)
        bad_id = uuid.uuid4()
        inv.package_expansion_snapshot = [{"service_id": str(bad_id), "included": True, "quantity": 1}]
        inv.save()
        with self.assertRaises(ValidationError):
            DiagnosticOrderCreationService.create_order_from_consultation(
                consultation=consultation, branch=self.branch, created_by=self.user
            )

    def test_inactive_service_raises(self):
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, svc=self.svc
        )
        DiagnosticServiceMaster.objects.filter(pk=self.svc.pk).update(is_active=False)
        try:
            with self.assertRaises(ValidationError):
                DiagnosticOrderCreationService.create_order_from_consultation(
                    consultation=consultation, branch=self.branch, created_by=self.user
                )
        finally:
            DiagnosticServiceMaster.objects.filter(pk=self.svc.pk).update(is_active=True)

    def test_rollback_on_validation_after_order_create_simulated(self):
        """If item creation failed mid-way, transaction rolls back — use invalid branch price."""
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, with_package=True, pkg=self.pkg, svc=self.svc
        )
        BranchServicePricing.objects.filter(branch=self.branch, service=self.svc).update(is_active=False)
        BranchPackagePricing.objects.filter(branch=self.branch, package=self.pkg).update(is_active=False)
        try:
            with self.assertRaises(ValidationError):
                DiagnosticOrderCreationService.create_order_from_consultation(
                    consultation=consultation, branch=self.branch, created_by=self.user
                )
            self.assertEqual(DiagnosticOrder.objects.filter(consultation=consultation).count(), 0)
        finally:
            BranchServicePricing.objects.filter(branch=self.branch, service=self.svc).update(is_active=True)
            BranchPackagePricing.objects.filter(branch=self.branch, package=self.pkg).update(is_active=True)


class CreateDiagnosticOrderAPIViewTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(name="Cat API", code=f"CAT-API-{uuid.uuid4().hex[:6]}")
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"svc_api_{uuid.uuid4().hex[:6]}",
            name="API Svc",
            category=cls.cat,
        )
        _, cls.branch = _lab_org_and_branch()
        past = timezone.now().date() - timedelta(days=7)
        BranchServicePricing.objects.create(
            branch=cls.branch,
            service=cls.svc,
            selling_price=Decimal("40"),
            platform_margin_type="flat",
            platform_margin_value=Decimal("1"),
            doctor_commission_type="flat",
            doctor_commission_value=Decimal("1"),
            valid_from=past,
        )

    def setUp(self):
        self.clinic = Clinic.objects.create(name=f"ClAPI-{uuid.uuid4().hex[:4]}")
        g, _ = Group.objects.get_or_create(name="doctor")
        self.user, self.doc_profile = _doctor_user_and_profile(self.clinic)
        self.user.groups.add(g)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.consultation, _, _, _, _, _ = _consultation_with_investigations(
            self.user, self.doc_profile, with_catalog=True, svc=self.svc
        )

    def test_api_success(self):
        url = reverse("diagnostic-order-create-from-consultation")
        r = self.client.post(
            url,
            {"consultation_id": str(self.consultation.id), "branch_id": str(self.branch.id)},
            format="json",
        )
        self.assertIn(r.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
        self.assertIn("order_id", r.data)
        self.assertEqual(r.data["items_created"], 1)

    def test_api_unauthorized(self):
        url = reverse("diagnostic-order-create-from-consultation")
        pg, _ = Group.objects.get_or_create(name="patient")
        pu = User.objects.create_user(username=f"pat_only_{uuid.uuid4().hex[:8]}", password="x")
        pu.groups.add(pg)
        c = APIClient()
        c.force_authenticate(user=pu)
        r = c.post(url, {"consultation_id": str(self.consultation.id)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


class DiagnosticOrderCreationConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def test_two_concurrent_calls_single_order(self):
        cat = DiagnosticCategory.objects.create(name="Cat Conc", code=f"CAT-C-{uuid.uuid4().hex[:6]}")
        svc = DiagnosticServiceMaster.objects.create(
            code=f"svc_c_{uuid.uuid4().hex[:6]}",
            name="Conc Svc",
            category=cat,
        )
        _, branch = _lab_org_and_branch()
        past = timezone.now().date() - timedelta(days=7)
        BranchServicePricing.objects.create(
            branch=branch,
            service=svc,
            selling_price=Decimal("30"),
            platform_margin_type="flat",
            platform_margin_value=Decimal("1"),
            doctor_commission_type="flat",
            doctor_commission_value=Decimal("1"),
            valid_from=past,
        )
        clinic = Clinic.objects.create(name=f"Cconc-{uuid.uuid4().hex[:4]}")
        user, doc_profile = _doctor_user_and_profile(clinic)
        consultation, _, _, _, _, _ = _consultation_with_investigations(
            user, doc_profile, with_catalog=True, svc=svc
        )

        barrier = threading.Barrier(2)
        results: list = []
        errors: list = []

        def worker():
            from django.db import connections

            try:
                barrier.wait()
                res = DiagnosticOrderCreationService.create_order_from_consultation(
                    consultation=Consultation.objects.get(pk=consultation.pk),
                    branch=branch,
                    created_by=user,
                )
                results.append(res.order.id)
            except Exception as e:
                errors.append(e)
            finally:
                connections.close_all()

        t1 = threading.Thread(target=worker)
        t2 = threading.Thread(target=worker)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertEqual(errors, [], msg=str(errors))
        self.assertEqual(len(set(results)), 1, msg=f"order ids: {results}")
        self.assertEqual(DiagnosticOrder.objects.filter(consultation_id=consultation.pk).count(), 1)
        order = DiagnosticOrder.objects.get(consultation_id=consultation.pk)
        self.assertEqual(order.items.filter(deleted_at__isnull=True).count(), 1)
        self.assertEqual(order.test_lines.count(), 1)
