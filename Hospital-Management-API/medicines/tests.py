import uuid

from django.core.cache import cache
from django.db.models import F
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from account.models import User
from analytics.models import DiagnosisMedicineMap, DoctorMedicineUsage, PatientMedicineUsage
from consultations_core.models.diagnosis import DiagnosisMaster
from medicines.models import DrugMaster, FormulationMaster
from medicines.services.cache import suggestion_cache_key
from medicines.services.ranking import MedicineRanker
from medicines.services.search_engine import MAX_CANDIDATES, search_medicines
from medicines.services.suggestion_engine import MedicineSuggestionEngine


class SuggestionCacheKeyTests(TestCase):
    def test_cache_key_includes_limit_segment(self):
        key = suggestion_cache_key(
            "550e8400-e29b-41d4-a716-446655440000",
            ["aa0e8400-e29b-41d4-a716-446655440001"],
            "np",
            12,
        )
        self.assertIn(":limit:12", key)


class SearchEngineLargeCatalogTests(TestCase):
    """
    Regression: search must stay bounded for huge DrugMaster tables.

    We cannot load millions of rows in CI; we create > MAX_CANDIDATES matching rows and
    assert the service never returns more than MAX_CANDIDATES (same as SQL LIMIT).
    """

    @classmethod
    def setUpTestData(cls):
        cls.form = FormulationMaster.objects.create(name="scale-form")
        rows = [
            DrugMaster(
                code=f"SC{i:05d}",
                brand_name=f"ScalxMed {i} Tablet",
                formulation=cls.form,
                is_active=True,
            )
            for i in range(MAX_CANDIDATES + 80)
        ]
        DrugMaster.objects.bulk_create(rows)

    def test_search_medicines_bounded_when_many_rows_match(self):
        hits = search_medicines("scalx", include_fts=False)
        self.assertLessEqual(
            len(hits),
            MAX_CANDIDATES,
            msg="Without a fixed cap, search cost grows with catalog size",
        )

    def test_max_candidates_constant_documented(self):
        self.assertEqual(MAX_CANDIDATES, 50)


class MedicineRankerTests(TestCase):
    def test_normalize_by_max(self):
        self.assertEqual(MedicineRanker.normalize_by_max([10.0, 5.0, 0.0]), [1.0, 0.5, 0.0])

    def test_final_score_weights(self):
        c = {"doctor": 1.0, "diagnosis": 0.0, "patient": 0.0, "global": 0.0}
        self.assertAlmostEqual(MedicineRanker.final_score(c), 0.4)

    def test_dominant_signal(self):
        c = {"doctor": 0.2, "diagnosis": 0.9, "patient": 0.1, "global": 0.0}
        self.assertEqual(MedicineRanker.dominant_signal(c), "diagnosis")

    def test_hybrid_merge_score(self):
        self.assertAlmostEqual(
            MedicineRanker.hybrid_merge_score(0.7, 0.5),
            0.7 + 0.2 * 0.5,
        )

    def test_search_norm_from_raw(self):
        self.assertAlmostEqual(MedicineRanker.search_norm_from_raw(140), 1.0)


class MedicineSuggestionEngineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="sugdoc",
            email="sugdoc@test.com",
            password="testpass123",
            first_name="S",
            last_name="Doc",
        )
        self.form = FormulationMaster.objects.create(name="tablet")
        self.drug_a = DrugMaster.objects.create(
            code="SUGA",
            brand_name="Alpha",
            formulation=self.form,
        )
        self.drug_b = DrugMaster.objects.create(
            code="SUGB",
            brand_name="Beta",
            formulation=self.form,
        )
        self.drug_c = DrugMaster.objects.create(
            code="SUGC",
            brand_name="Gamma",
            formulation=self.form,
        )
        DoctorMedicineUsage.objects.create(
            doctor=self.user,
            drug=self.drug_a,
            usage_count=100,
        )
        DoctorMedicineUsage.objects.create(
            doctor=self.user,
            drug=self.drug_b,
            usage_count=10,
        )

    def test_doctor_history_orders_quick_suggestions(self):
        engine = MedicineSuggestionEngine(doctor_id=self.user.id, limit=10)
        out = engine.run()
        quick = out["quick_suggestions"]
        self.assertGreaterEqual(len(quick), 1)
        self.assertEqual(quick[0]["drug"].id, self.drug_a.id)

    def test_run_ranked_rows_superset_of_bucket_drugs(self):
        engine = MedicineSuggestionEngine(doctor_id=self.user.id, limit=10)
        rows = engine.run_ranked_rows()
        buckets = engine.run()
        ranked_ids = {r["drug"].id for r in rows}
        bucket_ids = {r["drug"].id for rows in buckets.values() for r in rows}
        self.assertTrue(bucket_ids.issubset(ranked_ids))

    def test_diagnosis_boosts_mapped_drug(self):
        dx = DiagnosisMaster.objects.create(
            key="test-dx-sug",
            label="Test DX",
            category="test",
        )
        DiagnosisMedicineMap.objects.create(
            diagnosis=dx,
            drug=self.drug_c,
            weight=10.0,
        )
        engine = MedicineSuggestionEngine(
            doctor_id=self.user.id,
            diagnosis_ids=[dx.id],
            limit=10,
        )
        out = engine.run()
        all_ids = {r["drug"].id for rows in out.values() for r in rows}
        self.assertIn(self.drug_c.id, all_ids)
        dx_bucket = {r["drug"].id for r in out["based_on_diagnosis"]}
        quick_ids = {r["drug"].id for r in out["quick_suggestions"]}
        self.assertTrue(self.drug_c.id in dx_bucket or self.drug_c.id in quick_ids)

    def test_patient_history_signal(self):
        pid = uuid.uuid4()
        PatientMedicineUsage.objects.create(
            patient_id=pid,
            drug=self.drug_c,
            usage_count=50,
        )
        engine = MedicineSuggestionEngine(
            doctor_id=self.user.id,
            patient_id=pid,
            limit=10,
        )
        out = engine.run()
        all_ids = {r["drug"].id for rows in out.values() for r in rows}
        self.assertIn(self.drug_c.id, all_ids)
        pat_ids = {r["drug"].id for r in out["recent_for_patient"]}
        quick_ids = {r["drug"].id for r in out["quick_suggestions"]}
        self.assertTrue(self.drug_c.id in pat_ids or self.drug_c.id in quick_ids)

    def test_total_distinct_drugs_respects_limit(self):
        engine = MedicineSuggestionEngine(doctor_id=self.user.id, limit=10)
        out = engine.run()
        all_ids = [str(r["drug"].id) for rows in out.values() for r in rows]
        self.assertLessEqual(len(set(all_ids)), 10)
        self.assertLessEqual(len(all_ids), 10)

    def test_no_duplicate_drug_across_buckets(self):
        dx = DiagnosisMaster.objects.create(
            key="test-dx-dedup",
            label="Dedup DX",
            category="test",
        )
        DiagnosisMedicineMap.objects.create(diagnosis=dx, drug=self.drug_a, weight=5.0)
        engine = MedicineSuggestionEngine(
            doctor_id=self.user.id,
            diagnosis_ids=[dx.id],
            limit=15,
        )
        out = engine.run()
        seen: set = set()
        for bucket_name, rows in out.items():
            for r in rows:
                did = r["drug"].id
                self.assertNotIn(
                    did,
                    seen,
                    msg=f"duplicate {did} in {bucket_name} after prior bucket",
                )
                seen.add(did)

    def test_fallback_returns_globals_for_new_doctor(self):
        lone = User.objects.create_user(
            username="newdoc",
            email="newdoc@test.com",
            password="x",
            first_name="N",
            last_name="D",
        )
        engine = MedicineSuggestionEngine(doctor_id=lone.id, limit=10)
        out = engine.run()
        self.assertGreater(len(out["quick_suggestions"]), 0)
        self.assertLessEqual(
            len({r["drug"].id for rows in out.values() for r in rows}),
            10,
        )


class UsageIncrementPatternTests(TestCase):
    """Mirrors finalize() increment semantics for analytics rows."""

    def test_doctor_and_patient_increment(self):
        user = User.objects.create_user(
            username="usageu",
            email="usageu@test.com",
            password="testpass123",
            first_name="U",
            last_name="U",
        )
        form = FormulationMaster.objects.create(name="cap")
        drug = DrugMaster.objects.create(code="USG1", brand_name="Med", formulation=form)

        DoctorMedicineUsage.objects.get_or_create(
            doctor=user,
            drug=drug,
            defaults={"usage_count": 0},
        )
        DoctorMedicineUsage.objects.filter(doctor=user, drug=drug).update(
            usage_count=F("usage_count") + 1
        )
        self.assertEqual(DoctorMedicineUsage.objects.get(doctor=user, drug=drug).usage_count, 1)

        pid = uuid.uuid4()
        PatientMedicineUsage.objects.get_or_create(
            patient_id=pid,
            drug=drug,
            defaults={"usage_count": 0},
        )
        PatientMedicineUsage.objects.filter(patient_id=pid, drug=drug).update(
            usage_count=F("usage_count") + 1
        )
        self.assertEqual(
            PatientMedicineUsage.objects.get(patient_id=pid, drug=drug).usage_count,
            1,
        )


class MedicineSuggestionsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="apidoc",
            email="apidoc@test.com",
            password="testpass123",
            first_name="A",
            last_name="B",
        )
        self.form = FormulationMaster.objects.create(name="tab2")
        self.drug = DrugMaster.objects.create(
            code="API1",
            brand_name="Apidra",
            formulation=self.form,
        )
        DoctorMedicineUsage.objects.create(
            doctor=self.user,
            drug=self.drug,
            usage_count=5,
        )

    def test_suggestions_requires_doctor_id(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-suggestions")
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_suggestions_returns_buckets(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-suggestions")
        r = self.client.get(url, {"doctor_id": str(self.user.id)})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for key in (
            "quick_suggestions",
            "based_on_diagnosis",
            "doctor_preferred",
            "recent_for_patient",
            "others",
        ):
            self.assertIn(key, r.data)
        self.assertGreaterEqual(len(r.data["quick_suggestions"]), 1)
        item = r.data["quick_suggestions"][0]
        self.assertIn("source", item)
        self.assertIn("last_used", item)
        self.assertIn("last_used_ago", item)
        self.assertIn("display_name", item)
        self.assertIn("is_common", item)


class MedicineHybridAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="hybdoc",
            email="hybdoc@test.com",
            password="testpass123",
            first_name="H",
            last_name="Y",
        )
        self.other = User.objects.create_user(
            username="hybother",
            email="hybother@test.com",
            password="testpass123",
            first_name="O",
            last_name="T",
        )
        self.form = FormulationMaster.objects.create(name="hybtab")
        self.drug = DrugMaster.objects.create(
            code="HYB1",
            brand_name="Paracetamol",
            formulation=self.form,
            is_common=True,
        )
        DoctorMedicineUsage.objects.create(
            doctor=self.user,
            drug=self.drug,
            usage_count=50,
        )

    def test_hybrid_wrong_doctor_403(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-hybrid")
        r = self.client.get(
            url,
            {"doctor_id": str(self.other.id), "q": "para"},
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_hybrid_empty_q_suggestion_mode(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-hybrid")
        r = self.client.get(url, {"doctor_id": str(self.user.id)})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["meta"]["mode"], "suggestion")
        self.assertIn("results", r.data)
        self.assertIn("timing_ms", r.data["meta"])

    def test_hybrid_limit_capped_at_15(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-hybrid")
        r = self.client.get(
            url,
            {"doctor_id": str(self.user.id), "q": "a", "limit": 99},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(r.data["results"]), 15)

    def test_hybrid_no_duplicate_drug_ids_in_results(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-hybrid")
        r = self.client.get(
            url,
            {"doctor_id": str(self.user.id), "q": "para"},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in r.data["results"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_hybrid_short_query_returns_results(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-hybrid")
        r = self.client.get(
            url,
            {"doctor_id": str(self.user.id), "q": "p"},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["meta"]["mode"], "hybrid_light")
        ids = [row["id"] for row in r.data["results"]]
        self.assertIn(str(self.drug.id), ids)

    def test_hybrid_strong_mode_longer_query(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-hybrid")
        r = self.client.get(
            url,
            {"doctor_id": str(self.user.id), "q": "para"},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["meta"]["mode"], "hybrid_strong")

    def test_hybrid_result_shape(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("medicine-hybrid")
        r = self.client.get(
            url,
            {"doctor_id": str(self.user.id), "q": "para"},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        if r.data["results"]:
            row = r.data["results"][0]
            for key in (
                "id",
                "display_name",
                "brand_name",
                "strength",
                "drug_type",
                "formulation",
                "source",
                "score",
            ):
                self.assertIn(key, row)
            self.assertIn("name", row["formulation"])
