"""Tests for PrescriptionSummaryBuilder."""

import uuid
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from consultations_core.services.prescription_summary_builder import PrescriptionSummaryBuilder
from notifications.services.delivery.whatsapp_template_renderer import render_prescription_whatsapp_body


class PrescriptionSummaryBuilderTests(SimpleTestCase):
    @override_settings(WHATSAPP_SUMMARY_MAX_MEDICINES=5, WHATSAPP_SUMMARY_MAX_TESTS=5)
    @patch("consultations_core.services.prescription_summary_builder._build_prescriptions")
    @patch("consultations_core.services.prescription_summary_builder._build_doctor")
    def test_truncates_medicines_and_tests(self, mock_doctor, mock_prescriptions):
        mock_doctor.return_value = {"full_name": "Dhananjay Lambe"}
        mock_prescriptions.return_value = [
            {
                "drug_name": f"Med {i}",
                "dose_display_numeric": "1 tablet (1-0-1)",
                "timing_pattern": "1-0-1",
                "instructions": "After Food",
                "duration_display": "5 Days",
            }
            for i in range(8)
        ]

        prescription = MagicMock()
        prescription.id = uuid.uuid4()
        consultation = MagicMock()
        encounter = MagicMock()
        profile = MagicMock(first_name="John", last_name="Doe")
        encounter.patient_profile = profile
        encounter.patient_account.user = MagicMock()
        encounter.clinic = MagicMock(name="Clinic")
        encounter.doctor = MagicMock()
        consultation.encounter = encounter
        prescription.consultation = consultation

        investigations = MagicMock()
        investigations.items.all.return_value = [MagicMock(name=f"Test {i}") for i in range(7)]
        consultation.investigations = investigations

        summary = PrescriptionSummaryBuilder.build_whatsapp_summary(
            prescription=prescription,
            prescription_url="https://example.com/rx.pdf",
        )

        self.assertEqual(summary["medicine_total_count"], 8)
        self.assertEqual(summary["medicine_truncated_count"], 3)
        self.assertEqual(len(summary["medicine_summary"]), 5)
        self.assertEqual(summary["test_total_count"], 7)
        self.assertEqual(summary["test_truncated_count"], 2)
        self.assertEqual(len(summary["test_summary"]), 5)
        self.assertEqual(summary["medicine_summary"][0]["timing_pattern"], "1-0-1")

        body = render_prescription_whatsapp_body(summary)
        self.assertIn("Dr. Dhananjay Lambe", body)
        self.assertIn("+ 3 more medicines", body)
        self.assertIn("+ 2 more tests", body)
        self.assertNotIn("diagnosis", body.lower())
        self.assertNotIn("After Food", body)
        self.assertIn("• Med 0 (1-0-1, 5 Days)", body)

    @override_settings(WHATSAPP_SUMMARY_MAX_MEDICINES=5, WHATSAPP_SUMMARY_MAX_TESTS=5)
    @patch("consultations_core.services.prescription_summary_builder._build_prescriptions")
    @patch("consultations_core.services.prescription_summary_builder._build_doctor")
    def test_timing_pattern_propagated_to_medicine_rows(self, mock_doctor, mock_prescriptions):
        mock_doctor.return_value = {"full_name": "Amit Patil"}
        mock_prescriptions.return_value = [
            {
                "drug_name": "Dolo 650",
                "dose_display_numeric": "1 tablet (1-0-1)",
                "timing_pattern": "1-0-1",
                "duration_display": "5 Days",
            }
        ]

        prescription = MagicMock()
        consultation = MagicMock()
        encounter = MagicMock()
        profile = MagicMock(first_name="Jane", last_name="Doe")
        encounter.patient_profile = profile
        encounter.patient_account.user = MagicMock()
        encounter.clinic = MagicMock(name="Clinic")
        encounter.doctor = MagicMock()
        consultation.encounter = encounter
        prescription.consultation = consultation
        consultation.investigations = None

        summary = PrescriptionSummaryBuilder.build_whatsapp_summary(
            prescription=prescription,
            prescription_url="https://example.com/rx.pdf",
        )

        med = summary["medicine_summary"][0]
        self.assertEqual(med["name"], "Dolo 650")
        self.assertEqual(med["timing_pattern"], "1-0-1")
        self.assertEqual(med["duration_display"], "5 Days")
