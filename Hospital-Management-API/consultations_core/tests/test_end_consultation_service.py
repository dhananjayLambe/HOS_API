from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from consultations_core.services.end_consultation_service import (
    _extract_diagnoses_payload,
    _extract_findings_payload,
    _extract_symptoms_payload,
    _persist_medicines,
)


class EndConsultationPayloadExtractionTests(SimpleTestCase):
    def test_extract_symptoms_from_store_section_items(self):
        payload = {
            "store": {
                "sectionItems": {
                    "symptoms": [
                        {"label": "Headache", "detail": {"note": "x"}},
                    ]
                }
            }
        }
        extracted = _extract_symptoms_payload(payload)
        self.assertEqual(extracted, [{"name": "Headache", "detail": {"note": "x"}}])

    def test_extract_findings_prefers_draft_findings(self):
        payload = {
            "store": {
                "draftFindings": [
                    {"finding_code": "dehydration", "note": "mild", "is_deleted": False}
                ],
                "sectionItems": {"findings": [{"findingKey": "ignored"}]},
            }
        }
        extracted = _extract_findings_payload(payload)
        self.assertEqual(extracted, payload["store"]["draftFindings"])

    def test_extract_diagnoses_from_store_section_items(self):
        payload = {
            "store": {
                "sectionItems": {
                    "diagnosis": [
                        {
                            "label": "URTI",
                            "diagnosisKey": "upper_respiratory_infection",
                            "diagnosisIcdCode": "J06.9",
                            "detail": {"notes": "note"},
                        }
                    ]
                }
            }
        }
        extracted = _extract_diagnoses_payload(payload)
        self.assertEqual(len(extracted), 1)
        self.assertEqual(extracted[0]["diagnosis_label"], "URTI")
        self.assertEqual(extracted[0]["diagnosis_key"], "upper_respiratory_infection")
        self.assertEqual(extracted[0]["diagnosis_icd_code"], "J06.9")
        self.assertEqual(extracted[0]["doctor_note"], "note")


class EndConsultationMedicinesPersistenceTests(SimpleTestCase):
    @patch("consultations_core.services.end_consultation_service.PrescriptionLine")
    @patch("consultations_core.services.end_consultation_service._resolve_frequency")
    @patch("consultations_core.services.end_consultation_service._resolve_route")
    @patch("consultations_core.services.end_consultation_service._resolve_dose_unit")
    @patch("consultations_core.services.end_consultation_service.DrugMaster")
    @patch("consultations_core.services.end_consultation_service.Prescription")
    def test_persist_medicines_creates_and_finalizes_prescription(
        self,
        prescription_cls,
        drug_master_cls,
        resolve_dose_unit,
        resolve_route,
        resolve_frequency,
        prescription_line_cls,
    ):
        consultation = SimpleNamespace(encounter=SimpleNamespace(clinic=SimpleNamespace()))
        user = SimpleNamespace()
        prescription = MagicMock()
        prescription_cls.objects.create.return_value = prescription
        drug_master_cls.objects.filter.return_value.first.return_value = MagicMock()

        line_obj = MagicMock()
        prescription_line_cls.return_value = line_obj
        resolve_dose_unit.return_value = MagicMock()
        resolve_route.return_value = MagicMock()
        resolve_frequency.return_value = MagicMock()

        raw_medicines = [
            {
                "detail": {
                    "medicine": {
                        "drug_id": "173c9601-6b0b-4513-b7e0-bb6b00d07e03",
                        "dose_value": 1,
                        "dose_unit_id": "ml",
                        "route_id": "im",
                        "frequency_id": "BD",
                        "duration_value": 5,
                        "duration_unit": "days",
                        "instructions": "Use as directed",
                        "is_prn": False,
                        "is_stat": False,
                    }
                }
            }
        ]

        _persist_medicines(consultation=consultation, user=user, raw_medicines=raw_medicines)

        prescription_cls.objects.create.assert_called_once_with(
            consultation=consultation,
            created_by=user,
        )
        self.assertTrue(line_obj.save.called)
        self.assertTrue(prescription.finalize.called)
        prescription.delete.assert_not_called()

    @patch("consultations_core.services.end_consultation_service.Prescription")
    def test_persist_medicines_skips_when_empty(self, prescription_cls):
        _persist_medicines(consultation=SimpleNamespace(), user=SimpleNamespace(), raw_medicines=[])
        prescription_cls.objects.create.assert_not_called()

    @patch("consultations_core.services.end_consultation_service.DrugMaster")
    @patch("consultations_core.services.end_consultation_service.Prescription")
    def test_persist_medicines_raises_for_invalid_drug_id(self, prescription_cls, drug_master_cls):
        consultation = SimpleNamespace(encounter=SimpleNamespace(clinic=SimpleNamespace()))
        user = SimpleNamespace()
        prescription_cls.objects.create.return_value = MagicMock()
        drug_master_cls.objects.filter.return_value.first.return_value = None

        raw_medicines = [
            {
                "detail": {
                    "medicine": {
                        "drug_id": "invalid-drug",
                        "dose_value": 1,
                        "dose_unit_id": "ml",
                        "route_id": "im",
                        "frequency_id": "BD",
                    }
                }
            }
        ]

        with self.assertRaises(ValidationError):
            _persist_medicines(consultation=consultation, user=user, raw_medicines=raw_medicines)
