"""Tests for WhatsApp template body formatting."""

import uuid

from django.test import TestCase

from notifications.services.delivery.whatsapp_template_renderer import (
    EMPTY_MEDICINE_BLOCK,
    EMPTY_TEST_BLOCK,
    WHATSAPP_ITEM_SEPARATOR,
    build_template_components,
    format_whatsapp_medicine_block,
    format_whatsapp_test_block,
    resolve_medicine_block_text,
    resolve_test_block_text,
)


class WhatsAppTemplateRendererTests(TestCase):
    def test_single_medicine(self):
        medicines = [
            {
                "name": "Dolo 650",
                "timing_pattern": "1-0-1",
                "duration_display": "5 Days",
            }
        ]
        self.assertEqual(
            format_whatsapp_medicine_block(medicines),
            "• Dolo 650 (1-0-1, 5 Days)",
        )

    def test_multiple_medicines_compact_bullets(self):
        medicines = [
            {"name": "Dolo 650", "timing_pattern": "1-0-1", "duration_display": "5 Days"},
            {"name": "Pantoprazole 40 mg", "timing_pattern": "1-0-0", "duration_display": "7 Days"},
            {"name": "Vitamin D3", "timing_pattern": "0-0-1", "duration_display": "30 Days"},
        ]
        result = format_whatsapp_medicine_block(medicines)
        self.assertNotIn("|", result)
        self.assertNotIn("\n", result)
        self.assertEqual(
            result,
            "• Dolo 650 (1-0-1, 5 Days) • Pantoprazole 40 mg (1-0-0, 7 Days) • Vitamin D3 (0-0-1, 30 Days)",
        )

    def test_oxytime_example(self):
        medicines = [
            {"name": "Oxytime + Ointment", "timing_pattern": "1-0-1", "duration_display": "5 days"},
            {"name": "10 D Infusion", "timing_pattern": "1-0-1", "duration_display": "5 days"},
            {"name": "10 D 10% Injection", "timing_pattern": "1-0-1", "duration_display": "5 days"},
        ]
        self.assertEqual(
            format_whatsapp_medicine_block(medicines),
            "• Oxytime + Ointment (1-0-1, 5 days) • 10 D Infusion (1-0-1, 5 days) • 10 D 10% Injection (1-0-1, 5 days)",
        )

    def test_excludes_instructions(self):
        medicines = [
            {
                "name": "Oxytime + Ointment",
                "timing_pattern": "1-0-1",
                "duration_display": "5 Days",
                "timing_display": "Apply on affected area",
                "dose_display": "1 tablet (1-0-1)",
            }
        ]
        result = format_whatsapp_medicine_block(medicines)
        self.assertEqual(result, "• Oxytime + Ointment (1-0-1, 5 Days)")
        self.assertNotIn("Apply on affected area", result)

    def test_medicine_truncation(self):
        medicines = [{"name": "Dolo 650", "timing_pattern": "1-0-1", "duration_display": "5 Days"}]
        result = format_whatsapp_medicine_block(medicines, truncated_count=3)
        self.assertTrue(result.endswith("• + 3 more medicines"))

    def test_tests_format(self):
        tests = [
            {"name": "Complete Blood Count (CBC)"},
            {"name": "HbA1c"},
            {"name": "CT Abdomen"},
        ]
        self.assertEqual(
            format_whatsapp_test_block(tests),
            "Complete Blood Count (CBC) • HbA1c • CT Abdomen",
        )

    def test_frequency_fallback_from_dose_display(self):
        medicines = [
            {
                "name": "Dolo 650",
                "timing_pattern": "",
                "dose_display": "1 tablet (1-0-1)",
                "duration_display": "5 Days",
            }
        ]
        self.assertEqual(
            format_whatsapp_medicine_block(medicines),
            "• Dolo 650 (1-0-1, 5 Days)",
        )

    def test_build_template_components_empty_medicines(self):
        components = build_template_components(
            {
                "patient_name": "Rachana Lambe",
                "doctor_name": "Dr. Amit Patil",
                "medicine_summary": [],
                "test_summary": [],
            }
        )
        self.assertEqual(components["medicine_block"], EMPTY_MEDICINE_BLOCK)
        self.assertEqual(components["test_block"], EMPTY_TEST_BLOCK)

    def test_render_body_shows_no_medicines_message(self):
        from notifications.services.delivery.whatsapp_template_renderer import render_prescription_whatsapp_body

        body = render_prescription_whatsapp_body(
            {
                "patient_name": "Ada",
                "doctor_name": "Dr. Smith",
                "medicine_summary": [],
                "test_summary": [{"name": "CBC"}],
            }
        )
        self.assertIn("Medicines Prescribed:", body)
        self.assertIn(EMPTY_MEDICINE_BLOCK, body)
        self.assertIn("Tests Recommended:", body)
        self.assertIn("CBC", body)

    def test_resolve_blocks_empty_sections(self):
        self.assertEqual(resolve_medicine_block_text([]), EMPTY_MEDICINE_BLOCK)
        self.assertEqual(resolve_test_block_text([]), EMPTY_TEST_BLOCK)
        self.assertEqual(
            resolve_medicine_block_text([{"name": "Dolo", "timing_pattern": "1-0-1", "duration_display": "5d"}]),
            "• Dolo (1-0-1, 5d)",
        )
        self.assertEqual(resolve_test_block_text([{"name": "CBC"}]), "CBC")

    def test_build_template_components_compact_format(self):
        components = build_template_components(
            {
                "patient_name": "Rachana Lambe",
                "doctor_name": "Dr. Amit Patil",
                "medicine_summary": [
                    {"name": "Dolo 650", "timing_pattern": "1-0-1", "duration_display": "5 Days"},
                ],
                "test_summary": [{"name": "CBC"}],
                "prescription_url": "https://example.com/rx.pdf",
            }
        )
        self.assertEqual(components["medicine_block"], "• Dolo 650 (1-0-1, 5 Days)")
        self.assertEqual(components["test_block"], "CBC")
        self.assertNotIn("prescription_url", components)
        self.assertNotIn("|", components["medicine_block"])
        self.assertNotIn("\n", components["medicine_block"])


class RecommendationTemplateRendererTests(TestCase):
    def _result(self, *, mrp="1000", quoted="800", savings="200"):
        from decimal import Decimal

        from diagnostics_engine.domain.recommendation import ExpandedTestLine, RecommendationResult

        return RecommendationResult(
            available=True,
            failure_reason=None,
            consultation_id=uuid.uuid4(),
            recommended_lab=None,
            recommended_branch=None,
            collection_mode="lab",
            expanded_tests=[
                ExpandedTestLine(
                    service_id="s1",
                    code="CBC",
                    name="Complete Blood Count",
                    quantity=1,
                    investigation_item_id="i1",
                )
            ],
            quoted_price=Decimal(quoted),
            mrp_total=Decimal(mrp),
            savings=Decimal(savings),
        )

    def test_discount_mode_renders_mrp_and_savings(self):
        from notifications.services.delivery.whatsapp_template_renderer import (
            build_recommendation_template_components,
            render_recommendation_whatsapp_body,
            resolve_recommendation_pricing_display_mode,
        )

        result = self._result()
        self.assertEqual(resolve_recommendation_pricing_display_mode(result), "discount")
        body = render_recommendation_whatsapp_body(patient_name="Patient", result=result)
        self.assertIn("MRP: ₹1000", body)
        self.assertIn("You Save: ₹200", body)
        components = build_recommendation_template_components(patient_name="Patient", result=result)
        self.assertEqual(components["savings"], "200")

    def test_zero_savings_uses_flat_price_display(self):
        from notifications.services.delivery.whatsapp_template_renderer import (
            render_recommendation_flat_price_body,
            render_recommendation_whatsapp_body,
            resolve_recommendation_pricing_display_mode,
        )

        result = self._result(mrp="800", quoted="800", savings="0")
        self.assertEqual(resolve_recommendation_pricing_display_mode(result), "flat")
        body = render_recommendation_whatsapp_body(patient_name="Patient", result=result)
        self.assertIn("Price: ₹800", body)
        self.assertNotIn("You Save", body)
        self.assertNotIn("MRP:", body)
        flat = render_recommendation_flat_price_body(patient_name="Patient", result=result)
        self.assertIn("✔ Test Scheduling Support", flat)

    def test_long_test_names_sanitized_for_meta(self):
        from notifications.services.delivery.whatsapp_template_renderer import (
            build_recommendation_template_components,
        )

        from decimal import Decimal
        from diagnostics_engine.domain.recommendation import ExpandedTestLine, RecommendationResult

        names = [f"Very Long Diagnostic Test Name Number {i}" for i in range(16)]
        result = RecommendationResult(
            available=True,
            failure_reason=None,
            consultation_id=uuid.uuid4(),
            recommended_lab=None,
            recommended_branch=None,
            collection_mode="home",
            expanded_tests=[
                ExpandedTestLine(
                    service_id=f"s{i}",
                    code=f"T{i}",
                    name=name,
                    quantity=1,
                    investigation_item_id=f"i{i}",
                )
                for i, name in enumerate(names)
            ],
            quoted_price=Decimal("99999"),
            mrp_total=Decimal("99999"),
            savings=Decimal("0"),
        )
        components = build_recommendation_template_components(patient_name="A" * 200, result=result)
        self.assertLessEqual(len(components["test_names"]), 1024)
        self.assertNotIn("\n", components["test_names"])
