"""Tests for WhatsApp template body formatting."""

from django.test import TestCase

from notifications.services.delivery.whatsapp_template_renderer import (
    WHATSAPP_ITEM_SEPARATOR,
    build_template_components,
    format_whatsapp_medicine_block,
    format_whatsapp_test_block,
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
        self.assertEqual(components["medicine_block"], "-")
        self.assertEqual(components["test_block"], "-")

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
        self.assertNotIn("|", components["medicine_block"])
        self.assertNotIn("\n", components["medicine_block"])
