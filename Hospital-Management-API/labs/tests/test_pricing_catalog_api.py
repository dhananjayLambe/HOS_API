"""Tests for operational diagnostics catalog (pricing visibility) APIs."""

from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from diagnostics_engine.models import DiagnosticCategory, DiagnosticPackage, DiagnosticPackageItem, DiagnosticServiceMaster
from diagnostics_engine.tests.test_order_creation_service import _lab_org_and_branch
from labs.choices.auth import LabUserRole
from labs.models import BranchPackagePricing, BranchServicePricing, LabUser

User = get_user_model()

SERVICE_LIST_FORBIDDEN_KEYS = frozenset({
    "doctor_margin_snapshot",
    "lab_payout_snapshot",
    "platform_margin_snapshot",
    "doctor_commission_value",
    "doctor_commission_type",
    "settlement_cycle",
    "platform_margin_type",
    "platform_margin_value",
})

SERVICE_LIST_EXPECTED_KEYS = frozenset({
    "id",
    "service_name",
    "service_code",
    "category_name",
    "selling_price",
    "cost_price",
    "platform_margin",
    "currency",
    "home_collection_supported",
    "report_delivery_hours",
    "is_active",
    "is_available",
    "valid_from",
    "valid_to",
    "metadata",
    "updated_at",
    "workflow_hint",
    "display_status",
    "catalog_visibility",
    "last_synced_at",
    "is_sync_managed",
    "is_expired",
    "validity_label",
    "tat_label",
    "price_display",
    "cost_price_display",
    "platform_margin_display",
})

PACKAGE_LIST_EXPECTED_KEYS = frozenset({
    "id",
    "package_name",
    "package_lineage_code",
    "category_name",
    "tests_count",
    "mrp",
    "selling_price",
    "cost_price",
    "platform_margin",
    "currency",
    "fulfillment_mode",
    "home_collection_supported",
    "report_delivery_hours",
    "is_active",
    "is_available",
    "valid_from",
    "valid_to",
    "included_tests",
    "metadata",
    "updated_at",
    "display_status",
    "catalog_visibility",
    "last_synced_at",
    "is_sync_managed",
    "is_expired",
    "validity_label",
    "tat_label",
    "price_display",
    "mrp_display",
    "cost_price_display",
    "platform_margin_display",
    "fulfillment_label",
    "included_tests_preview",
})


def _lab_admin_with_branch(*, branch_name: str = "Pricing Branch"):
    labadmin_group, _ = Group.objects.get_or_create(name="labadmin")
    user = User.objects.create_user(
        username=f"labuser_{uuid.uuid4().hex[:8]}",
        email=f"lab_{uuid.uuid4().hex[:6]}@test.example",
        password="testpass123",
        first_name="Lab",
        last_name="Admin",
    )
    user.groups.add(labadmin_group)
    org, branch = _lab_org_and_branch()
    branch.branch_name = branch_name
    branch.save(update_fields=["branch_name"])
    LabUser.objects.create(
        user=user,
        organization=org,
        branch=branch,
        role=LabUserRole.ADMIN,
        employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
        is_primary_admin=True,
    )
    return user, branch, org


def _category(name_suffix: str | None = None):
    suffix = name_suffix or uuid.uuid4().hex[:6]
    return DiagnosticCategory.objects.create(name=f"Cat {suffix}", code=f"C-{suffix}")


def _service(cat, *, code: str | None = None, name: str = "CBC"):
    return DiagnosticServiceMaster.objects.create(
        code=code or f"svc_{uuid.uuid4().hex[:6]}",
        name=name,
        category=cat,
    )


def _service_pricing(branch, service, **kwargs):
    past = timezone.now().date() - timedelta(days=7)
    defaults = {
        "selling_price": Decimal("199.00"),
        "platform_margin_type": "flat",
        "platform_margin_value": Decimal("5"),
        "doctor_commission_type": "flat",
        "doctor_commission_value": Decimal("2"),
        "valid_from": past,
        "is_active": True,
        "is_available": True,
        "home_collection_supported": False,
        "report_delivery_hours": 24,
    }
    defaults.update(kwargs)
    return BranchServicePricing.objects.create(branch=branch, service=service, **defaults)


def _package_with_items(cat, services: list[DiagnosticServiceMaster], *, name: str = "Health Plus"):
    pkg = DiagnosticPackage.objects.create(
        lineage_code=f"ln_{uuid.uuid4().hex[:6]}",
        version=1,
        is_latest=True,
        name=name,
        category=cat,
    )
    for idx, svc in enumerate(services):
        DiagnosticPackageItem.objects.create(package=pkg, service=svc, display_order=idx)
    return pkg


class PricingCatalogAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user, self.branch, self.org = _lab_admin_with_branch()
        self.other_user, self.other_branch, _ = _lab_admin_with_branch(branch_name="Other Branch")
        self.client.force_authenticate(user=self.user)

        self.cat = _category("main")
        self.svc_cbc = _service(self.cat, name="Complete Blood Count", code="CBC-MAIN")
        self.svc_hba1c = _service(self.cat, name="HbA1c", code="HBA1C-MAIN")
        self.pricing_cbc = _service_pricing(
            self.branch,
            self.svc_cbc,
            home_collection_supported=True,
            report_delivery_hours=12,
        )
        self.pricing_hidden = _service_pricing(
            self.branch,
            _service(self.cat, name="Hidden Test", code="HID-1"),
            is_available=False,
            report_delivery_hours=48,
        )
        self.pricing_expired = _service_pricing(
            self.branch,
            _service(self.cat, name="Expired Test", code="EXP-1"),
            valid_to=timezone.now().date() - timedelta(days=1),
        )
        _service_pricing(self.other_branch, self.svc_cbc, selling_price=Decimal("1.00"))

        self.pkg = _package_with_items(self.cat, [self.svc_cbc, self.svc_hba1c])
        past = timezone.now().date() - timedelta(days=7)
        self.pkg_pricing = BranchPackagePricing.objects.create(
            branch=self.branch,
            package=self.pkg,
            mrp=Decimal("500.00"),
            selling_price=Decimal("399.00"),
            valid_from=past,
            is_active=True,
            is_available=True,
            home_collection_supported=True,
            report_delivery_hours=36,
        )

        self.summary_url = reverse("lab-pricing-summary")
        self.services_url = reverse("lab-pricing-services-list")
        self.packages_url = reverse("lab-pricing-packages-list")

    def test_summary_version_and_counts(self):
        res = self.client.get(self.summary_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["version"], "v1")
        self.assertGreaterEqual(res.data["active_services"], 3)
        self.assertEqual(res.data["active_packages"], 1)
        self.assertGreaterEqual(res.data["home_collection_enabled"], 2)
        self.assertIsNotNone(res.data["avg_tat_hours"])
        self.assertGreaterEqual(res.data["unavailable_tests"], 1)

    def test_services_list_version_and_pagination(self):
        res = self.client.get(self.services_url, {"page": 1, "page_size": 2})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["version"], "v1")
        self.assertIn("results", res.data)
        self.assertEqual(res.data["page_size"], 2)
        self.assertGreaterEqual(res.data["total"], 3)

    def test_services_branch_isolation(self):
        res = self.client.get(self.services_url, {"q": "CBC-MAIN"})
        codes = [r["service_code"] for r in res.data["results"]]
        self.assertIn("CBC-MAIN", codes)
        self.assertNotIn("1.00", [r["price_display"] for r in res.data["results"]])

    def test_services_search_by_category(self):
        res = self.client.get(self.services_url, {"q": self.cat.name})
        self.assertGreater(len(res.data["results"]), 0)

    def test_services_home_collection_filter(self):
        res = self.client.get(self.services_url, {"home_collection": "true"})
        for row in res.data["results"]:
            self.assertTrue(row["home_collection_supported"])

    def test_services_status_unavailable(self):
        res = self.client.get(self.services_url, {"status": "unavailable"})
        self.assertTrue(all(not r["is_available"] for r in res.data["results"]))

    def test_services_status_inactive_includes_inactive_rows(self):
        inactive = _service_pricing(
            self.branch,
            _service(self.cat, code="INACT-1"),
            is_active=False,
        )
        res = self.client.get(self.services_url, {"status": "inactive"})
        ids = [r["id"] for r in res.data["results"]]
        self.assertIn(str(inactive.id), ids)

    def test_services_tat_range(self):
        res = self.client.get(self.services_url, {"tat_min": 24, "tat_max": 48})
        for row in res.data["results"]:
            self.assertGreaterEqual(row["report_delivery_hours"], 24)
            self.assertLessEqual(row["report_delivery_hours"], 48)

    def test_services_ordering_whitelist(self):
        res = self.client.get(self.services_url, {"ordering": "selling_price"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_invalid_ordering_returns_400(self):
        res_svc = self.client.get(self.services_url, {"ordering": "unknown_field"})
        self.assertEqual(res_svc.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_svc.data["detail"], "Invalid ordering.")

        res_pkg = self.client.get(self.packages_url, {"ordering": "unknown_field"})
        self.assertEqual(res_pkg.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_pkg.data["detail"], "Invalid ordering.")

    def test_invalid_tat_param_returns_400(self):
        res_min = self.client.get(self.services_url, {"tat_min": "abc"})
        self.assertEqual(res_min.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_min.data["detail"], "Invalid tat_min.")

        res_max = self.client.get(self.services_url, {"tat_max": "test"})
        self.assertEqual(res_max.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_max.data["detail"], "Invalid tat_max.")

    def test_services_presenter_fields(self):
        res = self.client.get(self.services_url, {"q": "CBC-MAIN"})
        row = res.data["results"][0]
        self.assertIn("display_status", row)
        self.assertIn("catalog_visibility", row)
        self.assertIn("validity_label", row)
        self.assertIn("price_display", row)
        self.assertTrue(row["is_sync_managed"])

    def test_services_expired_display_status(self):
        res = self.client.get(self.services_url, {"q": "EXP-1"})
        row = res.data["results"][0]
        self.assertEqual(row["display_status"], "Expired")
        self.assertTrue(row["is_expired"])

    def test_packages_list_version_and_tests_count(self):
        res = self.client.get(self.packages_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["version"], "v1")
        row = next(r for r in res.data["results"] if r["id"] == str(self.pkg_pricing.id))
        self.assertEqual(row["tests_count"], 2)
        self.assertIn("included_tests_preview", row)
        preview = row["included_tests_preview"] or ""
        self.assertTrue(
            "Complete Blood Count" in preview or "HbA1c" in preview,
            msg=f"expected included test names in preview, got: {preview!r}",
        )

    def test_packages_included_tests_in_payload(self):
        res = self.client.get(self.packages_url)
        row = next(r for r in res.data["results"] if r["id"] == str(self.pkg_pricing.id))
        self.assertEqual(len(row["included_tests"]), 2)

    def test_packages_search(self):
        res = self.client.get(self.packages_url, {"q": "Health Plus"})
        self.assertEqual(len(res.data["results"]), 1)

    def test_unauthenticated_forbidden(self):
        anon = APIClient()
        self.assertEqual(anon.get(self.summary_url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_services_commercial_fields_from_cost_price(self):
        self.pricing_cbc.cost_price = Decimal("620.00")
        self.pricing_cbc.selling_price = Decimal("850.00")
        self.pricing_cbc.platform_margin_snapshot = None
        self.pricing_cbc.save(
            update_fields=["cost_price", "selling_price", "platform_margin_snapshot"],
        )
        res = self.client.get(self.services_url, {"q": "CBC-MAIN"})
        row = res.data["results"][0]
        self.assertEqual(row["cost_price"], "620.00")
        self.assertEqual(row["platform_margin"], "230.00")
        self.assertIn("620", row["cost_price_display"])
        self.assertIn("230", row["platform_margin_display"])

    def test_services_platform_margin_fallback_to_snapshot(self):
        svc = _service(self.cat, code="SNAP-1", name="Snapshot Test")
        _service_pricing(
            self.branch,
            svc,
            selling_price=Decimal("100.00"),
            cost_price=None,
            platform_margin_snapshot=Decimal("40.00"),
        )
        res = self.client.get(self.services_url, {"q": "SNAP-1"})
        row = res.data["results"][0]
        self.assertIsNone(row["cost_price"])
        self.assertEqual(row["platform_margin"], "40.00")

    def test_services_list_never_exposes_finance_snapshot_keys(self):
        res = self.client.get(self.services_url)
        forbidden = {
            "doctor_margin_snapshot",
            "lab_payout_snapshot",
            "platform_margin_snapshot",
            "doctor_commission_value",
            "doctor_commission_type",
            "settlement_cycle",
        }
        for row in res.data["results"]:
            self.assertFalse(forbidden.intersection(row.keys()))

    def test_packages_commercial_fields_null_safe(self):
        res = self.client.get(self.packages_url)
        row = next(r for r in res.data["results"] if r["id"] == str(self.pkg_pricing.id))
        self.assertIsNone(row["cost_price"])
        self.assertIsNone(row["platform_margin"])
        self.assertEqual(row["cost_price_display"], "—")
        self.assertEqual(row["platform_margin_display"], "—")
        self.assertIn("mrp_display", row)

    def test_packages_list_never_exposes_finance_snapshot_keys(self):
        res = self.client.get(self.packages_url)
        forbidden = {
            "doctor_margin_snapshot",
            "lab_payout_snapshot",
            "platform_margin_snapshot",
            "doctor_commission_value",
            "doctor_commission_type",
            "settlement_cycle",
            "platform_margin_type",
            "platform_margin_value",
        }
        for row in res.data["results"]:
            self.assertFalse(forbidden.intersection(row.keys()))

    def test_summary_never_exposes_commercial_row_keys(self):
        res = self.client.get(self.summary_url)
        forbidden = {"cost_price", "platform_margin", "doctor_margin_snapshot"}
        self.assertFalse(forbidden.intersection(res.data.keys()))

    def test_packages_branch_isolation(self):
        other_pkg = _package_with_items(self.cat, [self.svc_cbc], name="Other Branch Package")
        BranchPackagePricing.objects.create(
            branch=self.other_branch,
            package=other_pkg,
            mrp=Decimal("999.00"),
            selling_price=Decimal("888.00"),
            valid_from=timezone.now().date() - timedelta(days=7),
            is_active=True,
            is_available=True,
        )
        res = self.client.get(self.packages_url)
        names = [r["package_name"] for r in res.data["results"]]
        self.assertNotIn("Other Branch Package", names)
        self.assertNotIn("888.00", [r["price_display"] for r in res.data["results"]])

        summary = self.client.get(self.summary_url)
        self.assertEqual(summary.data["active_packages"], 1)

    def test_deleted_service_pricing_excluded_from_list(self):
        svc = _service(self.cat, code="DEL-SVC-1", name="Deleted Service Test")
        row = _service_pricing(self.branch, svc)
        deleted_id = str(row.id)
        row.delete()
        res = self.client.get(self.services_url, {"q": "DEL-SVC-1"})
        ids = [r["id"] for r in res.data["results"]]
        self.assertNotIn(deleted_id, ids)

    def test_deleted_package_pricing_excluded_from_list(self):
        pkg = _package_with_items(self.cat, [self.svc_hba1c], name="Deleted Package Test")
        row = BranchPackagePricing.objects.create(
            branch=self.branch,
            package=pkg,
            mrp=Decimal("100.00"),
            selling_price=Decimal("80.00"),
            valid_from=timezone.now().date() - timedelta(days=7),
            is_active=True,
            is_available=True,
        )
        deleted_id = str(row.id)
        row.delete()
        res = self.client.get(self.packages_url, {"q": "Deleted Package Test"})
        ids = [r["id"] for r in res.data["results"]]
        self.assertNotIn(deleted_id, ids)

    def test_deleted_rows_excluded_from_summary(self):
        svc = _service(self.cat, code="DEL-SUM-1", name="Summary Delete Test")
        row = _service_pricing(self.branch, svc)
        active_before = self.client.get(self.summary_url).data["active_services"]
        row.delete()
        summary = self.client.get(self.summary_url).data
        self.assertEqual(summary["active_services"], active_before - 1)

    def test_empty_branch_summary_returns_zeros(self):
        empty_user, empty_branch, _ = _lab_admin_with_branch(branch_name="Empty Catalog Branch")
        client = APIClient()
        client.force_authenticate(user=empty_user)
        res = client.get(self.summary_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["active_services"], 0)
        self.assertEqual(res.data["active_packages"], 0)
        self.assertEqual(res.data["home_collection_enabled"], 0)
        self.assertEqual(res.data["unavailable_tests"], 0)
        self.assertIsNone(res.data["avg_tat_hours"])

    def test_service_list_response_key_contract(self):
        res = self.client.get(self.services_url, {"q": "CBC-MAIN"})
        self.assertGreater(len(res.data["results"]), 0)
        row = res.data["results"][0]
        self.assertEqual(frozenset(row.keys()), SERVICE_LIST_EXPECTED_KEYS)
        for item in res.data["results"]:
            self.assertFalse(SERVICE_LIST_FORBIDDEN_KEYS.intersection(item.keys()))

    def test_package_list_response_key_contract(self):
        res = self.client.get(self.packages_url)
        row = next(r for r in res.data["results"] if r["id"] == str(self.pkg_pricing.id))
        self.assertEqual(frozenset(row.keys()), PACKAGE_LIST_EXPECTED_KEYS)
        for item in res.data["results"]:
            self.assertFalse(SERVICE_LIST_FORBIDDEN_KEYS.intersection(item.keys()))

    def test_metadata_finance_keys_stripped_from_api(self):
        svc = _service(self.cat, code="META-1", name="Metadata Sanitize Test")
        row = _service_pricing(
            self.branch,
            svc,
            metadata={
                "workflow_hint": "visible",
                "doctor_margin_snapshot": "99",
                "lab_payout_snapshot": "50",
            },
        )
        res = self.client.get(self.services_url, {"q": "META-1"})
        row_data = next(r for r in res.data["results"] if r["id"] == str(row.id))
        meta = row_data["metadata"]
        self.assertEqual(meta.get("workflow_hint"), "visible")
        self.assertNotIn("doctor_margin_snapshot", meta)
        self.assertNotIn("lab_payout_snapshot", meta)

    def test_services_list_query_count_bounded(self):
        with CaptureQueriesContext(connection) as ctx:
            res = self.client.get(self.services_url, {"page_size": 20})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(ctx.captured_queries), 8)

    def test_packages_list_query_count_bounded(self):
        with CaptureQueriesContext(connection) as ctx:
            res = self.client.get(self.packages_url, {"page_size": 20})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(ctx.captured_queries), 8)
