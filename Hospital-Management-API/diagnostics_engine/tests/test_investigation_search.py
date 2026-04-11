import unittest
import uuid

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)

User = get_user_model()


@unittest.skipUnless(connection.vendor == "postgresql", "Investigation search requires PostgreSQL + pg_trgm")
@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
)
class InvestigationSearchAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = DiagnosticCategory.objects.create(
            name="Laboratory",
            code=f"LAB-{uuid.uuid4().hex[:8]}",
        )
        cls.svc_cbc = DiagnosticServiceMaster.objects.create(
            code="cbc",
            name="Complete Blood Count (CBC)",
            short_name="CBC",
            category=cls.cat,
            synopsis="Measures RBC, WBC, platelets",
            synonyms=[],
        )
        cls.svc_rbs = DiagnosticServiceMaster.objects.create(
            code="rbs",
            name="Random Blood Sugar",
            short_name="RBS",
            category=cls.cat,
            synonyms=["sugar"],
        )
        cls.svc_lft = DiagnosticServiceMaster.objects.create(
            code="lft",
            name="Liver Function Test",
            short_name="LFT",
            category=cls.cat,
            synonyms=[],
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code="fever_panel",
            version=1,
            is_latest=True,
            category=cls.cat,
            name="Fever Panel",
            description="Includes CBC, CRP, ESR",
        )
        DiagnosticPackageItem.objects.create(package=cls.pkg, service=cls.svc_cbc)
        cls.user = User.objects.create_user(username="search_tester", password="x")

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = reverse("diagnostic-investigation-search")

    def test_requires_auth(self):
        bare = APIClient()
        r = bare.get(self.url, {"q": "cbc"})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_q_400(self):
        r = self.client.get(self.url, {"q": ""})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_short_q_400(self):
        r = self.client.get(self.url, {"q": "c"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cbc_exact_and_meta(self):
        r = self.client.get(self.url, {"q": "cbc", "limit": 10})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.data
        self.assertIn("tests", data)
        self.assertIn("packages", data)
        self.assertIn("meta", data)
        self.assertEqual(data["meta"]["query"], "cbc")
        codes = [t["id"] for t in data["tests"]]
        self.assertIn("cbc", codes)
        self.assertEqual(data["meta"]["total_results"], len(data["tests"]) + len(data["packages"]))
        self.assertEqual(data["tests"][0].get("type"), "test")

    def test_case_insensitive_cbc(self):
        r1 = self.client.get(self.url, {"q": "CBC"})
        r2 = self.client.get(self.url, {"q": "cbc"})
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(
            [t["id"] for t in r1.data["tests"]],
            [t["id"] for t in r2.data["tests"]],
        )

    def test_synonym_sugar(self):
        r = self.client.get(self.url, {"q": "sugar"})
        self.assertEqual(r.status_code, 200)
        ids = [t["id"] for t in r.data["tests"]]
        self.assertIn("rbs", ids)

    def test_typo_livr_matches_liver(self):
        r = self.client.get(self.url, {"q": "livr"})
        self.assertEqual(r.status_code, 200)
        ids = [t["id"] for t in r.data["tests"]]
        self.assertIn("lft", ids)

    def test_type_test_only(self):
        r = self.client.get(self.url, {"q": "cbc", "type": "test"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["packages"], [])

    def test_type_package_only(self):
        r = self.client.get(self.url, {"q": "fever", "type": "package"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["tests"], [])
        self.assertTrue(len(r.data["packages"]) >= 1)

    def test_mixed_cbc_panel(self):
        r = self.client.get(self.url, {"q": "cbc panel", "type": "all"})
        self.assertEqual(r.status_code, 200)
        body = r.data
        test_ids = {t["id"] for t in body["tests"]}
        pkg_ids = {p["id"] for p in body["packages"]}
        self.assertIn("cbc", test_ids)
        self.assertIn("fever_panel", pkg_ids)

    def test_package_has_type_and_test_count(self):
        r = self.client.get(self.url, {"q": "fever", "type": "package"})
        self.assertEqual(r.status_code, 200)
        pkgs = r.data["packages"]
        self.assertTrue(pkgs)
        self.assertEqual(pkgs[0]["type"], "package")
        self.assertEqual(pkgs[0]["test_count"], 1)

    def test_package_includes_service_codes_prefetched_order(self):
        r = self.client.get(self.url, {"q": "fever", "type": "package"})
        self.assertEqual(r.status_code, 200)
        pkgs = r.data["packages"]
        self.assertTrue(pkgs)
        codes = pkgs[0].get("service_codes")
        self.assertIsInstance(codes, list)
        self.assertEqual(codes, ["cbc"])

    def test_test_includes_sample_tat_preparation(self):
        r = self.client.get(self.url, {"q": "cbc", "type": "test"})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["tests"])
        row = r.data["tests"][0]
        self.assertIn("sample_type", row)
        self.assertIn("tat_hours_default", row)
        self.assertIn("preparation_notes", row)
        self.assertEqual(row["tat_hours_default"], 24)

    def test_limit_max_20_validation(self):
        r = self.client.get(self.url, {"q": "cbc", "limit": 99})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
