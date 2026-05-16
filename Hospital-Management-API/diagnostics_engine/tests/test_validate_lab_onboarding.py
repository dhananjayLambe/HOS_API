"""Tests for validate_lab_onboarding command and LabOnboardingValidator."""

from __future__ import annotations

import json
import uuid
from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from diagnostics_engine.models import DiagnosticCategory, DiagnosticPackage, DiagnosticServiceMaster
from diagnostics_engine.services.routing.lab_onboarding_validator import (
    LabOnboardingValidator,
    PRICE_MISSING,
    MARKETPLACE_INELIGIBLE,
    ORG_NOT_APPROVED,
    ORG_NOT_VERIFIED,
    BRANCH_DISABLED,
    PINCODE_UNSUPPORTED,
    HOME_COLLECTION_DISABLED,
    ONBOARDING_FAILURE_CODES,
    _dedupe_failure_codes,
)
from diagnostics_engine.tests.test_order_creation_service import _pricing
from diagnostics_engine.tests.test_routing_service import _branch_with_area_and_org
from labs.choices.auth import LabType, RegistrationStatus
from labs.models.branch_pricing import BranchServiceArea, BranchServicePricing
from labs.models.lab_auth import LabBranch, LabOrganization


class LabOnboardingValidatorUnitTests(TestCase):
    def test_dedupe_failure_codes_respects_priority(self):
        codes = [PRICE_MISSING, ORG_NOT_APPROVED, PRICE_MISSING]
        ordered = _dedupe_failure_codes(codes)
        self.assertEqual(ordered[0], ORG_NOT_APPROVED)
        self.assertIn(PRICE_MISSING, ordered)
        self.assertEqual(len(ordered), 2)

    def test_onboarding_failure_codes_tuple(self):
        self.assertIn("ROUTING_REJECTED", ONBOARDING_FAILURE_CODES)


class ValidateLabOnboardingTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(
            name="Cat Onboard", code=f"CAT-OB-{uuid.uuid4().hex[:6]}"
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"LAB-CBC-OB-{uuid.uuid4().hex[:6]}",
            name="CBC Onboarding Test",
            category=cls.cat,
        )
        cls.org, cls.branch = _branch_with_area_and_org()
        LabOrganization.objects.filter(pk=cls.org.pk).update(home_collection_available=True)
        cls.org.refresh_from_db()
        BranchServiceArea.objects.filter(branch=cls.branch).update(
            pincode="416002", city="kolhapur", is_home_collection_available=True
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_ob_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="Ob Pkg",
            category=cls.cat,
        )
        _pricing(cls.branch, cls.svc, cls.pkg, svc_price=Decimal("850.00"), pkg_price=Decimal("1200.00"))
        past = timezone.now().date() - timedelta(days=7)
        BranchServicePricing.objects.filter(branch=cls.branch, service=cls.svc).update(valid_from=past)

    def _call(self, **kwargs):
        out = StringIO()
        defaults = {
            "lab_id": self.branch.branch_code,
            "pincode": "416002",
            "tests": [self.svc.code],
            "home_collection": True,
            "stdout": out,
        }
        defaults.update(kwargs)
        call_command("validate_lab_onboarding", **defaults)
        return out.getvalue()

    def test_happy_path_ready(self):
        text = self._call()
        self.assertIn("READY_FOR_PRODUCTION", text)
        self.assertIn("Overall Readiness: READY", text)
        self.assertIn("Organization Checks: PASSED", text)

    def test_missing_pricing(self):
        BranchServicePricing.objects.filter(branch=self.branch, service=self.svc).delete()
        text = self._call()
        self.assertIn("NOT_READY", text)
        self.assertIn("PRICE_MISSING", text)
        self.assertIn("Missing pricing", text)

    def test_inactive_org_not_verified(self):
        LabOrganization.objects.filter(pk=self.org.pk).update(
            is_verified=False,
            registration_status=RegistrationStatus.PENDING,
        )
        text = self._call()
        self.assertIn("NOT_READY", text)
        self.assertIn("ORG_NOT_VERIFIED", text)
        self.assertIn("MARKETPLACE_INELIGIBLE", text)

    def test_inactive_org_not_approved(self):
        LabOrganization.objects.filter(pk=self.org.pk).update(
            registration_status=RegistrationStatus.PENDING,
        )
        text = self._call()
        self.assertIn("ORG_NOT_APPROVED", text)

    def test_inactive_branch(self):
        LabBranch.objects.filter(pk=self.branch.pk).update(is_active_for_orders=False)
        text = self._call()
        self.assertIn("NOT_READY", text)
        self.assertIn("BRANCH_DISABLED", text)

    def test_pincode_missing(self):
        text = self._call(pincode="560001")
        self.assertIn("NOT_READY", text)
        self.assertIn("PINCODE_UNSUPPORTED", text)

    def test_home_collection_disabled(self):
        LabOrganization.objects.filter(pk=self.org.pk).update(home_collection_available=False)
        text = self._call()
        self.assertIn("NOT_READY", text)
        self.assertIn("HOME_COLLECTION_DISABLED", text)

    def test_marketplace_exclusion_pending_org(self):
        org = LabOrganization.objects.create(
            organization_name="Pending OB",
            display_name="Pending OB",
            organization_code=f"ORG-OB-PND-{uuid.uuid4().hex[:8]}",
            slug=f"ob-pnd-{uuid.uuid4().hex[:8]}",
            lab_type=LabType.PATHOLOGY_LAB,
            owner_name="Owner",
            primary_contact_number="9999999992",
            registration_status=RegistrationStatus.PENDING,
            is_verified=False,
            onboarding_completed=False,
            is_active_for_orders=False,
        )
        branch = LabBranch.objects.create(
            organization=org,
            branch_name="Pending OB Branch",
            branch_code=f"BR-OB-PND-{uuid.uuid4().hex[:8]}",
            is_active=True,
            is_active_for_orders=True,
            home_collection_available=True,
        )
        BranchServiceArea.objects.create(
            branch=branch,
            pincode="416002",
            is_active=True,
            is_home_collection_available=True,
        )
        text = self._call(lab_id=branch.branch_code)
        self.assertIn("MARKETPLACE_INELIGIBLE", text)
        self.assertIn("Failed conditions", text)
        self.assertIn("registration_status", text)

    def test_json_output(self):
        out = StringIO()
        call_command(
            "validate_lab_onboarding",
            lab_id=self.branch.branch_code,
            pincode="416002",
            tests=[self.svc.code],
            home_collection=True,
            json_output=True,
            stdout=out,
        )
        payload = json.loads(out.getvalue())
        self.assertTrue(payload["eligible"])
        self.assertEqual(payload["final_status"], "READY_FOR_PRODUCTION")
        self.assertTrue(payload["checks"]["pricing"])

    def test_json_output_not_ready(self):
        BranchServicePricing.objects.filter(branch=self.branch, service=self.svc).delete()
        out = StringIO()
        call_command(
            "validate_lab_onboarding",
            lab_id=self.branch.branch_code,
            pincode="416002",
            tests=[self.svc.code],
            home_collection=True,
            json_output=True,
            stdout=out,
        )
        payload = json.loads(out.getvalue())
        self.assertFalse(payload["eligible"])
        self.assertIn(PRICE_MISSING, payload["failure_codes"])
        self.assertFalse(payload["checks"]["pricing"])

    def test_strict_exits_on_not_ready(self):
        BranchServicePricing.objects.filter(branch=self.branch, service=self.svc).delete()
        with self.assertRaises(SystemExit) as ctx:
            call_command(
                "validate_lab_onboarding",
                lab_id=self.branch.branch_code,
                pincode="416002",
                tests=[self.svc.code],
                home_collection=True,
                strict=True,
                stdout=StringIO(),
            )
        self.assertEqual(ctx.exception.code, 1)

    def test_strict_passes_when_ready(self):
        call_command(
            "validate_lab_onboarding",
            lab_id=self.branch.branch_code,
            pincode="416002",
            tests=[self.svc.code],
            home_collection=True,
            strict=True,
            stdout=StringIO(),
        )

    def test_unknown_test_command_error(self):
        with self.assertRaises(CommandError):
            call_command(
                "validate_lab_onboarding",
                lab_id=self.branch.branch_code,
                pincode="416002",
                tests=["NONEXISTENT-TEST-XYZ"],
                stdout=StringIO(),
            )

    def test_validator_direct_happy_path(self):
        validator = LabOnboardingValidator(
            lab_id=self.branch.branch_code,
            pincode="416002",
            test_tokens=[self.svc.code],
            home_collection=True,
        )
        report = validator.run()
        self.assertTrue(report.ready)
        self.assertEqual(report.failure_codes, [])

    def test_no_db_writes_from_command(self):
        pricing_count_before = BranchServicePricing.objects.filter(
            branch=self.branch, service=self.svc
        ).count()
        self._call()
        pricing_count_after = BranchServicePricing.objects.filter(
            branch=self.branch, service=self.svc
        ).count()
        self.assertEqual(pricing_count_before, pricing_count_after)
