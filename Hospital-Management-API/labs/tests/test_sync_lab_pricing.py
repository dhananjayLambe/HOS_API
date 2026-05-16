"""Tests for sync_lab_pricing / import_lab_pricing Phase 1 rules."""

from __future__ import annotations

import tempfile
import uuid
from decimal import Decimal
from pathlib import Path

from django.test import TestCase
from openpyxl import Workbook

from diagnostics_engine.models.catalog import DiagnosticCategory, DiagnosticServiceMaster
from diagnostics_engine.services.pricing_templates import constants as C
from diagnostics_engine.services.pricing_templates.excel_utils import validate_import_metadata
from diagnostics_engine.services.pricing_templates.importer import LabPricingImportStrictAbort, import_lab_pricing
from labs.choices.auth import LabType, RegistrationStatus
from labs.models import BranchServicePricing, LabAddress, LabBranch, LabOrganization


def _minimal_workbook(*, branch_code: str, rows: list[dict]) -> Path:
    wb = Workbook()
    ws0 = wb.active
    ws0.title = C.METADATA_SHEET_NAME
    ws0.append(["Key", "Value"])
    ws0.append(["branch_code", branch_code])
    ws0.append(["template_version", C.TEMPLATE_VERSION])
    ws1 = wb.create_sheet(C.PRICING_SHEET_NAME)
    ws1.append(list(C.PRICING_HEADERS))
    for r in rows:
        ws1.append([r.get(h, "") for h in C.PRICING_HEADERS])
    tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
    path = Path(tmp.name)
    tmp.close()
    wb.save(path)
    return path


def _make_branch(*, code_suffix: str | None = None) -> tuple[LabBranch, DiagnosticServiceMaster]:
    suffix = code_suffix or uuid.uuid4().hex[:8]
    org = LabOrganization.objects.create(
        organization_name=f"Lab {suffix}",
        display_name=f"Lab {suffix}",
        organization_code=f"O-{suffix}",
        slug=f"lab-{suffix}",
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
        branch_code=f"BR-{suffix}",
        is_active=True,
        is_active_for_orders=True,
    )
    LabAddress.objects.create(
        branch=branch,
        address_line_1="1 St",
        city="Pune",
        state="MH",
        pincode="411001",
    )
    cat = DiagnosticCategory.objects.create(name=f"Cat{suffix}", code=f"C-{suffix}")
    svc = DiagnosticServiceMaster.objects.create(
        code=f"SVC-{suffix}",
        name="Test Svc",
        category=cat,
        sample_type="Blood",
        tat_hours_default=24,
        home_collection_possible=False,
    )
    return branch, svc


class SyncLabPricingTests(TestCase):
    def test_validate_import_metadata(self):
        with self.assertRaises(ValueError):
            validate_import_metadata({})
        validate_import_metadata({"branch_code": "x", "template_version": "v1"})

    def test_only_true_rows_imported_false_skipped(self):
        branch, svc = _make_branch()
        path = _minimal_workbook(
            branch_code=branch.branch_code,
            rows=[
                {
                    "service_code": svc.code,
                    "selling_price": 100,
                    "cost_price": 60,
                    "report_delivery_hours": 24,
                    "home_collection_supported": "FALSE",
                    "is_available": "TRUE",
                    "remarks": "",
                },
                {
                    "service_code": svc.code,
                    "selling_price": 200,
                    "cost_price": 100,
                    "report_delivery_hours": 24,
                    "home_collection_supported": "FALSE",
                    "is_available": "FALSE",
                    "remarks": "",
                },
            ],
        )
        try:
            stats = import_lab_pricing(path)
            self.assertEqual(stats.created, 1)
            self.assertEqual(stats.skipped, 1)
            self.assertEqual(
                BranchServicePricing.objects.filter(branch=branch, service=svc).count(), 1
            )
        finally:
            path.unlink(missing_ok=True)

    def test_cost_price_zero_allowed(self):
        branch, svc = _make_branch()
        path = _minimal_workbook(
            branch_code=branch.branch_code,
            rows=[
                {
                    "service_code": svc.code,
                    "selling_price": 100,
                    "cost_price": 0,
                    "report_delivery_hours": "",
                    "home_collection_supported": "FALSE",
                    "is_available": "TRUE",
                    "remarks": "",
                },
            ],
        )
        try:
            stats = import_lab_pricing(path)
            self.assertEqual(stats.created, 1)
            p = BranchServicePricing.objects.get(branch=branch, service=svc)
            self.assertEqual(p.cost_price, Decimal("0"))
            self.assertEqual(p.platform_margin_snapshot, Decimal("100"))
        finally:
            path.unlink(missing_ok=True)

    def test_reimport_updates_same_row(self):
        branch, svc = _make_branch()
        row = {
            "service_code": svc.code,
            "selling_price": 100,
            "cost_price": 50,
            "report_delivery_hours": 24,
            "home_collection_supported": "FALSE",
            "is_available": "TRUE",
            "remarks": "a",
        }
        path = _minimal_workbook(branch_code=branch.branch_code, rows=[row])
        path2 = None
        try:
            import_lab_pricing(path)
            row["selling_price"] = 120
            row["cost_price"] = 55
            path2 = _minimal_workbook(branch_code=branch.branch_code, rows=[row])
            stats = import_lab_pricing(path2)
            self.assertEqual(stats.updated, 1)
            self.assertEqual(
                BranchServicePricing.objects.filter(branch=branch, service=svc, is_active=True).count(),
                1,
            )
            p = BranchServicePricing.objects.get(branch=branch, service=svc, is_active=True)
            self.assertEqual(p.selling_price, Decimal("120"))
        finally:
            path.unlink(missing_ok=True)
            if path2:
                path2.unlink(missing_ok=True)

    def test_reimport_same_values_counts_unchanged(self):
        branch, svc = _make_branch()
        row = {
            "service_code": svc.code,
            "selling_price": 100,
            "cost_price": 50,
            "report_delivery_hours": 24,
            "home_collection_supported": "FALSE",
            "is_available": "TRUE",
            "remarks": "",
        }
        path = _minimal_workbook(branch_code=branch.branch_code, rows=[row])
        try:
            import_lab_pricing(path)
            stats2 = import_lab_pricing(path)
            self.assertEqual(stats2.created, 0)
            self.assertEqual(stats2.updated, 0)
            self.assertEqual(stats2.unchanged, 1)
        finally:
            path.unlink(missing_ok=True)

    def test_margin_invalid_fails_row(self):
        branch, svc = _make_branch()
        path = _minimal_workbook(
            branch_code=branch.branch_code,
            rows=[
                {
                    "service_code": svc.code,
                    "selling_price": 50,
                    "cost_price": 80,
                    "report_delivery_hours": 24,
                    "home_collection_supported": "FALSE",
                    "is_available": "TRUE",
                    "remarks": "",
                },
            ],
        )
        try:
            stats = import_lab_pricing(path)
            self.assertEqual(stats.failed, 1)
            self.assertFalse(BranchServicePricing.objects.filter(branch=branch, service=svc).exists())
        finally:
            path.unlink(missing_ok=True)

    def test_true_without_selling_price_fails(self):
        branch, svc = _make_branch()
        path = _minimal_workbook(
            branch_code=branch.branch_code,
            rows=[
                {
                    "service_code": svc.code,
                    "selling_price": "",
                    "cost_price": 50,
                    "report_delivery_hours": 24,
                    "home_collection_supported": "FALSE",
                    "is_available": "TRUE",
                    "remarks": "",
                },
            ],
        )
        try:
            stats = import_lab_pricing(path)
            self.assertEqual(stats.failed, 1)
        finally:
            path.unlink(missing_ok=True)

    def test_dry_run_no_writes(self):
        branch, svc = _make_branch()
        path = _minimal_workbook(
            branch_code=branch.branch_code,
            rows=[
                {
                    "service_code": svc.code,
                    "selling_price": 100,
                    "cost_price": 50,
                    "report_delivery_hours": 24,
                    "home_collection_supported": "FALSE",
                    "is_available": "TRUE",
                    "remarks": "",
                },
            ],
        )
        try:
            stats = import_lab_pricing(path, dry_run=True)
            self.assertEqual(stats.created, 1)
            self.assertFalse(BranchServicePricing.objects.filter(branch=branch, service=svc).exists())
        finally:
            path.unlink(missing_ok=True)

    def test_strict_aborts_on_first_error(self):
        branch, svc = _make_branch()
        path = _minimal_workbook(
            branch_code=branch.branch_code,
            rows=[
                {
                    "service_code": "NOPE",
                    "selling_price": 100,
                    "cost_price": 50,
                    "report_delivery_hours": 24,
                    "home_collection_supported": "FALSE",
                    "is_available": "TRUE",
                    "remarks": "",
                },
            ],
        )
        try:
            with self.assertRaises(LabPricingImportStrictAbort):
                import_lab_pricing(path, strict=True)
        finally:
            path.unlink(missing_ok=True)
