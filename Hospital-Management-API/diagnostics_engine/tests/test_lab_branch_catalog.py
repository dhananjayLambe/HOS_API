"""Catalog pricing / fulfillment use labs.LabBranch as the branch anchor."""

import uuid
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from diagnostics_engine.domain.fulfillment import FulfillmentValidationService
from diagnostics_engine.domain.pricing import PricingQuoteService
from diagnostics_engine.models import DiagnosticCategory, DiagnosticPackage, DiagnosticPackageItem, DiagnosticServiceMaster
from diagnostics_engine.models.choices import CommissionType
from labs.models import (
    BranchPackagePricing,
    BranchServiceArea,
    BranchServicePricing,
    LabAddress,
    LabBranch,
    LabOrganization,
    LabType,
    RegistrationStatus,
)


class LabBranchCatalogPricingTests(TestCase):
    def test_quote_and_strict_fulfillment_with_lab_branch(self):
        cat = DiagnosticCategory.objects.create(name=f"Cat {uuid.uuid4().hex[:8]}", code=f"C-{uuid.uuid4().hex[:8]}")
        svc = DiagnosticServiceMaster.objects.create(
            code=f"s-{uuid.uuid4().hex[:8]}",
            name="Test Svc",
            category=cat,
        )
        pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln-{uuid.uuid4().hex[:8]}",
            version=1,
            is_latest=True,
            name="Test Pkg",
            category=cat,
        )
        DiagnosticPackageItem.objects.create(
            package=pkg,
            service=svc,
            quantity=1,
            is_mandatory=True,
            display_order=1,
        )

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

        past = timezone.now().date() - timedelta(days=7)
        BranchPackagePricing.objects.create(
            branch=branch,
            package=pkg,
            mrp=100,
            selling_price=80,
            platform_margin_type=CommissionType.FLAT,
            platform_margin_value=0,
            doctor_commission_type=CommissionType.FLAT,
            doctor_commission_value=0,
            valid_from=past,
        )
        BranchServicePricing.objects.create(
            branch=branch,
            service=svc,
            selling_price=80,
            platform_margin_type=CommissionType.FLAT,
            platform_margin_value=0,
            doctor_commission_type=CommissionType.FLAT,
            doctor_commission_value=0,
            valid_from=past,
        )
        BranchServiceArea.objects.create(branch=branch, pincode="400001")

        quote = PricingQuoteService.quote_package_line(branch, pkg)
        self.assertEqual(quote["selling_price"], 80)
        self.assertFalse(quote["is_price_derived"])

        ok, _msg = FulfillmentValidationService.branch_fulfills_package(branch, pkg, pincode="400001")
        self.assertTrue(ok)
