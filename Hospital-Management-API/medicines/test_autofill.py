from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from account.models import User
from medicines.models import DrugMaster, FormulationMaster, DrugType
from medicines.services.autofill import build_autofill, clear_master_cache, load_master_cache
from medicines.services.autofill.rules import (
    DOSE_UNIT_MAP,
    INSTRUCTION_MAP,
    ROUTE_MAP,
    dose_unit_for_type,
    instruction_texts_for_type,
    route_for_type,
)


class AutofillRulesCoverageTests(TestCase):
    """Every DrugType plus inferred ``gel`` must have dose, route, and instruction rows."""

    def test_every_drugtype_enum_key_in_all_maps(self):
        for dt in DrugType:
            key = dt.value
            with self.subTest(drug_type=key):
                self.assertIn(key, DOSE_UNIT_MAP)
                self.assertIn(key, ROUTE_MAP)
                self.assertIn(key, INSTRUCTION_MAP)
                self.assertTrue((dose_unit_for_type(key) or "").strip())
                self.assertTrue(len(route_for_type(key)) == 2)
                self.assertIsInstance(instruction_texts_for_type(key), list)

    def test_inferred_gel_key_in_all_maps(self):
        self.assertIn("gel", DOSE_UNIT_MAP)
        self.assertIn("gel", ROUTE_MAP)
        self.assertIn("gel", INSTRUCTION_MAP)

    def test_build_autofill_smoke_each_drug_type(self):
        clear_master_cache()
        form = FormulationMaster.objects.create(name="cov-form")
        empty = {"dose_units": {}, "routes": {}, "frequencies": {}}
        for dt in DrugType:
            drug = DrugMaster.objects.create(
                code=f"COV-{dt.value.upper()[:8]}",
                brand_name=f"Cov {dt.value}",
                formulation=form,
                drug_type=dt,
            )
            with self.subTest(code=drug.code):
                af = build_autofill(drug, master_cache=empty)
                self.assertIn("dose", af)
                self.assertIn("route", af)
                self.assertIn("instructions", af)
                self.assertEqual(af["dose"]["value"], 1)


class AutofillBuildTests(TestCase):
    def setUp(self):
        clear_master_cache()
        self.form = FormulationMaster.objects.create(name="af-tab")
        self.empty_cache = {
            "dose_units": {},
            "routes": {},
            "frequencies": {},
        }

    def tearDown(self):
        clear_master_cache()

    def test_none_drug_returns_empty(self):
        self.assertEqual(build_autofill(None, master_cache=self.empty_cache), {})

    def test_tablet_dose_route_and_instruction(self):
        drug = DrugMaster.objects.create(
            code="AF-TAB",
            brand_name="TabMed",
            formulation=self.form,
            drug_type=DrugType.TABLET,
        )
        af = build_autofill(drug, master_cache=self.empty_cache)
        self.assertEqual(af["dose"]["value"], 1)
        self.assertEqual(af["dose"]["unit"], "tablet")
        self.assertIsNone(af["dose"]["unit_id"])
        self.assertEqual(af["route"]["name"], "Oral")
        self.assertIsNone(af["route"]["id"])
        self.assertEqual(af["frequency"]["code"], "BD")
        self.assertEqual(af["frequency"]["display"], "Twice Daily")
        self.assertEqual(af["timing"]["time_slots"], ["morning", "night"])
        self.assertEqual(af["timing"]["relation"], "after_food")
        self.assertEqual(len(af["instructions"]), 1)
        self.assertEqual(af["instructions"][0]["text"], "Take after meals")

    def test_syrup_ml_and_oral(self):
        drug = DrugMaster.objects.create(
            code="AF-SYP",
            brand_name="SyrMed",
            formulation=self.form,
            drug_type=DrugType.SYRUP,
        )
        af = build_autofill(drug, master_cache=self.empty_cache)
        self.assertEqual(af["dose"]["unit"], "ml")
        self.assertEqual(af["route"]["name"], "Oral")

    def test_cream_gm_and_topical(self):
        drug = DrugMaster.objects.create(
            code="AF-CRM",
            brand_name="CreamMed",
            formulation=self.form,
            drug_type=DrugType.CREAM,
        )
        af = build_autofill(drug, master_cache=self.empty_cache)
        self.assertEqual(af["dose"]["unit"], "gm")
        self.assertEqual(af["route"]["name"], "Topical")
        self.assertEqual(af["instructions"][0]["text"], "Apply on affected area")

    def test_tablet_flag_but_brand_says_cream_infers_topical(self):
        """Real data often leaves drug_type at TABLET while brand/formulation say Cream."""
        form_cream = FormulationMaster.objects.create(name="Cream")
        drug = DrugMaster.objects.create(
            code="AF-CRM2",
            brand_name="2Azole Cream",
            formulation=form_cream,
            drug_type=DrugType.TABLET,
        )
        af = build_autofill(drug, master_cache=self.empty_cache)
        self.assertEqual(af["dose"]["unit"], "gm")
        self.assertEqual(af["route"]["name"], "Topical")
        self.assertIn("Apply on affected area", [x["text"] for x in af["instructions"]])

    def test_tablet_flag_brand_oxytime_plus_ointment_infers_ointment(self):
        """Packaging tube / split brand names: ointment signal in brand + optional composition."""
        form_tube = FormulationMaster.objects.create(name="Tube")
        drug = DrugMaster.objects.create(
            code="AF-OXY-OINT",
            brand_name="1 Oxytime + Ointment",
            formulation=form_tube,
            drug_type=DrugType.TABLET,
            composition="Ointment BP 15g tube",
        )
        af = build_autofill(drug, master_cache=self.empty_cache)
        self.assertEqual(af["dose"]["unit"], "gm")
        self.assertEqual(af["route"]["name"], "Topical")

    def test_unknown_drug_type_falls_back_to_tablet_oral(self):
        drug = DrugMaster.objects.create(
            code="AF-UNK",
            brand_name="Weird",
            formulation=self.form,
            drug_type=DrugType.OTHER,
        )
        af = build_autofill(drug, master_cache=self.empty_cache)
        self.assertEqual(af["dose"]["unit"], "tablet")
        self.assertEqual(af["route"]["name"], "Oral")

    def test_load_master_cache_does_not_break_when_db_empty_of_masters(self):
        clear_master_cache()
        mc = load_master_cache()
        self.assertIn("dose_units", mc)
        self.assertIn("routes", mc)
        self.assertIn("frequencies", mc)

    def test_autofill_route_codes_resolve_in_master_cache(self):
        """Migration 0009 seeds RouteMaster rows so autofill can attach route.id for all ROUTE_MAP codes."""
        from medicines.services.autofill.rules import ALL_ROUTE_CODES

        clear_master_cache()
        mc = load_master_cache()
        routes = mc.get("routes") or {}
        for code in sorted(ALL_ROUTE_CODES):
            self.assertIn(
                code,
                routes,
                msg=f"RouteMaster missing code {code!r} — apply medicines.0009_seed_autofill_route_and_dose_masters",
            )


class AutofillSuggestionsAPITests(TestCase):
    def setUp(self):
        cache.clear()
        clear_master_cache()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="af_sug",
            email="af_sug@test.com",
            password="testpass123",
            first_name="A",
            last_name="F",
        )
        self.form = FormulationMaster.objects.create(name="af-sug-f")
        self.drug = DrugMaster.objects.create(
            code="AFS1",
            brand_name="AutofillSug",
            formulation=self.form,
        )
        from analytics.models import DoctorMedicineUsage

        DoctorMedicineUsage.objects.create(
            doctor=self.user,
            drug=self.drug,
            usage_count=5,
        )

    def tearDown(self):
        clear_master_cache()

    def test_autofill_present_in_each_bucket_item(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-suggestions")
        r = self.client.get(url, {"doctor_id": str(self.user.id)})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for bucket_name, rows in r.data.items():
            for item in rows:
                self.assertIn(
                    "autofill",
                    item,
                    msg=f"missing autofill in bucket {bucket_name}",
                )
                af = item["autofill"]
                for k in ("dose", "frequency", "timing", "duration", "route", "instructions"):
                    self.assertIn(k, af, msg=f"bucket {bucket_name}")


class AutofillHybridAPITests(TestCase):
    def setUp(self):
        cache.clear()
        clear_master_cache()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="af_hyb",
            email="af_hyb@test.com",
            password="testpass123",
            first_name="A",
            last_name="H",
        )
        self.form = FormulationMaster.objects.create(name="af-hyb-f")
        self.drug = DrugMaster.objects.create(
            code="AFH1",
            brand_name="Paracetamol",
            formulation=self.form,
            is_common=True,
        )
        from analytics.models import DoctorMedicineUsage

        DoctorMedicineUsage.objects.create(
            doctor=self.user,
            drug=self.drug,
            usage_count=50,
        )

    def tearDown(self):
        clear_master_cache()

    def test_hybrid_results_include_autofill(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-hybrid")
        # Empty q uses suggestion ranking (doctor usage); stable non-empty results.
        r = self.client.get(url, {"doctor_id": str(self.user.id)})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(r.data["results"]), 1)
        for row in r.data["results"]:
            self.assertIn("autofill", row)
            self.assertIn("dose", row["autofill"])
