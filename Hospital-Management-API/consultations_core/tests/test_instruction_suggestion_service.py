from unittest.mock import patch

from django.test import SimpleTestCase

from consultations_core.services.instruction_suggestion_service import (
    get_instruction_suggestions,
    normalize_specialty,
)
from consultations_core.tests.fixtures_instruction_suggestions import FakeInstructionMetadata


def _fake_loader_get(path: str):
    return FakeInstructionMetadata.loader_get(path)


@patch(
    "consultations_core.services.instruction_suggestion_service.MetadataLoader.get",
    side_effect=_fake_loader_get,
)
class InstructionSuggestionServiceTests(SimpleTestCase):
    def test_normalize_specialty(self, _mock):
        self.assertEqual(normalize_specialty("  Cardiologist "), "cardiologist")

    def test_cardiologist_search_pressure_returns_monitor_row_with_fields(self, _mock):
        # Substring match on label (case-insensitive), e.g. "pressure" in "... blood pressure ..."
        out = get_instruction_suggestions(q="pressure", specialty="cardiologist", limit=20)
        self.assertEqual(out["meta"]["total"], 1)
        self.assertEqual(out["meta"]["filtered"], 1)
        row = out["data"][0]
        self.assertEqual(row["key"], "monitor_blood_pressure")
        self.assertTrue(row["requires_input"])
        self.assertEqual(len(row["fields"]), 1)
        self.assertEqual(row["fields"][0]["key"], "frequency_per_day")

    def test_invalid_specialty_falls_back_to_global_list(self, _mock):
        out = get_instruction_suggestions(specialty="not_a_real_specialty", limit=100)
        self.assertEqual(out["meta"]["total"], 4)
        keys = {r["key"] for r in out["data"]}
        self.assertEqual(keys, set(FakeInstructionMetadata.MASTER["items"].keys()))

    def test_search_no_match_returns_empty(self, _mock):
        out = get_instruction_suggestions(q="zzznomatch", limit=20)
        self.assertEqual(out["data"], [])
        self.assertEqual(out["meta"]["total"], 0)
        self.assertEqual(out["meta"]["filtered"], 0)

    def test_exclude_removes_keys(self, _mock):
        out = get_instruction_suggestions(
            specialty="cardiologist",
            limit=20,
            exclude=["monitor_blood_pressure", "adequate_rest"],
        )
        keys = {r["key"] for r in out["data"]}
        self.assertNotIn("monitor_blood_pressure", keys)
        self.assertNotIn("adequate_rest", keys)
        self.assertIn("low_salt_diet", keys)

    def test_sort_warning_before_monitoring_when_no_specialty(self, _mock):
        """Category weight: warning_signs before monitoring when specialty order is flat."""
        out = get_instruction_suggestions(limit=10)
        keys = [r["key"] for r in out["data"]]
        idx_er = keys.index("visit_er_if_chest_pain")
        idx_bp = keys.index("monitor_blood_pressure")
        self.assertLess(idx_er, idx_bp)

    def test_meta_total_before_limit(self, _mock):
        out = get_instruction_suggestions(specialty="cardiologist", limit=2)
        self.assertEqual(out["meta"]["total"], 4)
        self.assertEqual(out["meta"]["filtered"], 2)
        self.assertEqual(len(out["data"]), 2)
