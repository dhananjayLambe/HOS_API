"""Tests for debug_lab_routing command and routing_debug service."""

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
from diagnostics_engine.services.routing.routing_debug import (
    FailureCode,
    LabRoutingScenarioDebugger,
    build_manual_location,
    resolve_catalog_services,
)
from diagnostics_engine.tests.test_order_creation_service import _pricing
from diagnostics_engine.tests.test_routing_service import _branch_with_area_and_org
from labs.choices.auth import LabType, RegistrationStatus
from labs.models.branch_pricing import BranchServiceArea, BranchServicePricing
from labs.models.lab_auth import LabBranch, LabOrganization


class RoutingDebugServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(
            name="Cat Debug", code=f"CAT-DBG-{uuid.uuid4().hex[:6]}"
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"LAB-CBC-DBG-{uuid.uuid4().hex[:6]}",
            name="Complete Blood Count",
            category=cls.cat,
        )
        cls.org, cls.branch = _branch_with_area_and_org()
        LabOrganization.objects.filter(pk=cls.org.pk).update(home_collection_available=True)
        cls.org.refresh_from_db()
        BranchServiceArea.objects.filter(branch=cls.branch).update(
            pincode="416002", city="kolhapur", is_home_collection_available=True
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_dbg_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="Dbg Pkg",
            category=cls.cat,
        )
        _pricing(cls.branch, cls.svc, cls.pkg, svc_price=Decimal("99.00"), pkg_price=Decimal("150.00"))
        past = timezone.now().date() - timedelta(days=7)
        BranchServicePricing.objects.filter(branch=cls.branch, service=cls.svc).update(valid_from=past)

    def test_run_scenario_eligible_home_collection(self):
        debugger = LabRoutingScenarioDebugger()
        report = debugger.run_scenario(
            pincode="416002",
            test_tokens=[self.svc.code],
            home_collection=True,
            lab_id=self.branch.branch_code,
        )
        self.assertEqual(len(report.branch_results), 1)
        r = report.branch_results[0]
        self.assertTrue(r.marketplace_ok)
        self.assertTrue(r.eligible)
        self.assertIsNone(r.primary_reason)
        self.assertEqual(report.progressive_counts["final_eligible"], 1)

    def test_pending_org_lab_disabled(self):
        org = LabOrganization.objects.create(
            organization_name="Pending Org",
            display_name="Pending",
            organization_code=f"ORG-PND-{uuid.uuid4().hex[:8]}",
            slug=f"pnd-{uuid.uuid4().hex[:8]}",
            lab_type=LabType.PATHOLOGY_LAB,
            owner_name="Owner",
            primary_contact_number="9999999991",
            registration_status=RegistrationStatus.PENDING,
            is_verified=False,
            onboarding_completed=False,
            is_active_for_orders=False,
        )
        branch = LabBranch.objects.create(
            organization=org,
            branch_name="Pending Branch",
            branch_code=f"BR-PND-{uuid.uuid4().hex[:8]}",
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
        report = LabRoutingScenarioDebugger().run_scenario(
            pincode="416002",
            test_tokens=[self.svc.code],
            home_collection=True,
            lab_id=branch.branch_code,
        )
        r = report.branch_results[0]
        self.assertFalse(r.marketplace_ok)
        self.assertFalse(r.eligible)
        self.assertEqual(r.primary_reason, FailureCode.LAB_DISABLED)

    def test_price_missing(self):
        BranchServicePricing.objects.filter(branch=self.branch, service=self.svc).delete()
        report = LabRoutingScenarioDebugger().run_scenario(
            pincode="416002",
            test_tokens=[self.svc.code],
            home_collection=True,
            lab_id=self.branch.branch_code,
        )
        r = report.branch_results[0]
        self.assertTrue(r.marketplace_ok)
        self.assertFalse(r.eligible)
        self.assertEqual(r.primary_reason, FailureCode.PRICE_MISSING)
        self.assertIn("missing_test_pricing", r.ineligibility_reasons)

    def test_resolve_catalog_by_name(self):
        services = resolve_catalog_services(["Complete Blood Count"])
        self.assertEqual(len(services), 1)
        self.assertEqual(services[0].pk, self.svc.pk)


class DebugLabRoutingCommandTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(
            name="Cat CMD", code=f"CAT-CMD-{uuid.uuid4().hex[:6]}"
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"LAB-CBC-CMD-{uuid.uuid4().hex[:6]}",
            name="CBC Command Test",
            category=cls.cat,
        )
        cls.org, cls.branch = _branch_with_area_and_org()
        LabOrganization.objects.filter(pk=cls.org.pk).update(home_collection_available=True)
        BranchServiceArea.objects.filter(branch=cls.branch).update(
            pincode="416002", is_home_collection_available=True
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_cmd_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="Cmd Pkg",
            category=cls.cat,
        )
        _pricing(cls.branch, cls.svc, cls.pkg, svc_price=Decimal("50.00"), pkg_price=Decimal("90.00"))
        past = timezone.now().date() - timedelta(days=7)
        BranchServicePricing.objects.filter(branch=cls.branch, service=cls.svc).update(valid_from=past)

    def test_command_eligible_output(self):
        out = StringIO()
        call_command(
            "debug_lab_routing",
            pincode="416002",
            tests=[self.svc.code],
            home_collection=True,
            lab_id=self.branch.branch_code,
            stdout=out,
        )
        text = out.getvalue()
        self.assertIn("Production IR codes", text)
        self.assertIn("ROUTING SUMMARY", text)
        self.assertIn("FINAL STATUS: ELIGIBLE", text)

    def test_command_verbose_ir_json(self):
        out = StringIO()
        call_command(
            "debug_lab_routing",
            pincode="416002",
            tests=[self.svc.code],
            home_collection=True,
            lab_id=self.branch.branch_code,
            verbose_ir=True,
            stdout=out,
        )
        text = out.getvalue()
        idx = text.index("VERBOSE IR (JSON)")
        json_blob = text[idx + len("VERBOSE IR (JSON)") :].strip()
        payload = json.loads(json_blob)
        self.assertIsInstance(payload, list)
        self.assertEqual(len(payload), 1)
        self.assertTrue(payload[0]["eligible"])
        self.assertIn("ineligibility_reasons", payload[0])

    def test_command_unknown_test(self):
        with self.assertRaises(CommandError):
            call_command(
                "debug_lab_routing",
                pincode="416002",
                tests=["NONEXISTENT-TEST-XYZ"],
                stdout=StringIO(),
            )

    def test_build_manual_location(self):
        loc = build_manual_location(pincode="416002", city="kolhapur")
        self.assertEqual(loc.pincode, "416002")
        self.assertEqual(loc.city, "kolhapur")
