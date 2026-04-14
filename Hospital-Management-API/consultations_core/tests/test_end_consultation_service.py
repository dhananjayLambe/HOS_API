import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from consultations_core.services.end_consultation_service import (
    _PROCEDURES_PAYLOAD_OMITTED,
    _extract_diagnoses_payload,
    _extract_findings_payload,
    _extract_follow_up_payload,
    _extract_investigations_payload,
    _extract_symptoms_payload,
    _persist_follow_up,
    _persist_medicines,
    _resolve_procedures_for_persist,
)
from consultations_core.services.procedure_service import persist_procedures


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

    def test_extract_investigations_from_store_section_items(self):
        payload = {
            "store": {
                "sectionItems": {
                    "investigations": [
                        {"source": "catalog", "catalog_item_id": "550e8400-e29b-41d4-a716-446655440000"}
                    ]
                }
            }
        }
        extracted = _extract_investigations_payload(payload)
        self.assertEqual(len(extracted), 1)
        self.assertEqual(extracted[0]["source"], "catalog")

    def test_extract_investigations_top_level(self):
        payload = {"investigations": [{"source": "package", "diagnostic_package_id": "550e8400-e29b-41d4-a716-446655440001"}]}
        extracted = _extract_investigations_payload(payload)
        self.assertEqual(len(extracted), 1)


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


class EndConsultationFollowUpExtractionTests(SimpleTestCase):
    def test_extract_follow_up_none_when_no_keys(self):
        payload = {"store": {"sectionItems": {}}}
        self.assertIsNone(_extract_follow_up_payload(payload))

    def test_extract_follow_up_from_meta(self):
        payload = {
            "store": {
                "meta": {
                    "follow_up": {
                        "date": "2026-04-19T00:00:00.000Z",
                        "interval": 5,
                        "unit": "days",
                        "reason": "review",
                    }
                }
            }
        }
        n = _extract_follow_up_payload(payload)
        self.assertEqual(n["date"], datetime.date(2026, 4, 19))
        self.assertEqual(n["interval"], 5)
        self.assertEqual(n["unit"], "days")
        self.assertEqual(n["reason"], "review")
        self.assertFalse(n["early_if_persist"])

    def test_extract_follow_up_meta_precedence_over_flat(self):
        payload = {
            "store": {
                "meta": {
                    "follow_up": {
                        "date": "2026-01-02",
                        "interval": 0,
                        "unit": "days",
                        "reason": "",
                    }
                },
                "follow_up_date": "2099-12-31",
                "follow_up_interval": 99,
            }
        }
        n = _extract_follow_up_payload(payload)
        self.assertEqual(n["date"], datetime.date(2026, 1, 2))
        self.assertEqual(n["interval"], 0)

    def test_extract_follow_up_flat_store_keys(self):
        payload = {
            "store": {
                "follow_up_date": "2026-05-01",
                "follow_up_interval": 0,
                "follow_up_unit": "days",
                "follow_up_reason": "",
                "follow_up_early_if_persist": False,
            }
        }
        n = _extract_follow_up_payload(payload)
        self.assertEqual(n["date"], datetime.date(2026, 5, 1))
        self.assertEqual(n["interval"], 0)

    def test_extract_follow_up_top_level_dict(self):
        payload = {"follow_up": {"date": "2026-06-15", "interval": 0, "unit": "days", "reason": ""}}
        n = _extract_follow_up_payload(payload)
        self.assertEqual(n["date"], datetime.date(2026, 6, 15))


class EndConsultationProceduresResolverTests(SimpleTestCase):
    def test_procedures_omitted_when_no_key(self):
        payload = {"store": {"sectionItems": {}}}
        self.assertIs(
            _resolve_procedures_for_persist(payload),
            _PROCEDURES_PAYLOAD_OMITTED,
        )

    def test_procedures_from_store_trimmed(self):
        payload = {"store": {"procedures": "  Suture  ", "sectionItems": {}}}
        self.assertEqual(_resolve_procedures_for_persist(payload), "Suture")

    def test_procedures_empty_string_means_clear(self):
        payload = {"store": {"procedures": "", "sectionItems": {}}}
        self.assertIsNone(_resolve_procedures_for_persist(payload))

    def test_procedures_explicit_null_means_clear(self):
        payload = {"store": {"procedures": None, "sectionItems": {}}}
        self.assertIsNone(_resolve_procedures_for_persist(payload))

    def test_procedures_store_precedence_over_section_items(self):
        payload = {
            "store": {
                "procedures": "from store",
                "sectionItems": {"procedures": "from section"},
            }
        }
        self.assertEqual(_resolve_procedures_for_persist(payload), "from store")

    def test_procedures_from_section_items_when_store_key_absent(self):
        payload = {"store": {"sectionItems": {"procedures": "section note"}}}
        self.assertEqual(_resolve_procedures_for_persist(payload), "section note")

    def test_procedures_non_string_raises(self):
        payload = {"store": {"procedures": ["x"], "sectionItems": {}}}
        with self.assertRaises(ValidationError) as ctx:
            _resolve_procedures_for_persist(payload)
        self.assertIn("procedures", ctx.exception.message_dict)


class EndConsultationProcedureServiceTests(SimpleTestCase):
    @patch("consultations_core.services.procedure_service.Procedure.objects")
    def test_persist_procedures_delete_then_create(self, proc_objects):
        consultation = SimpleNamespace(id="c1")
        user = SimpleNamespace()
        created = MagicMock()
        proc_objects.create.return_value = created

        persist_procedures(consultation, "Dressing done", user)

        proc_objects.filter.assert_called_once_with(consultation=consultation)
        proc_objects.filter.return_value.delete.assert_called_once()
        proc_objects.create.assert_called_once_with(
            consultation=consultation,
            notes="Dressing done",
            created_by=user,
            updated_by=user,
        )

    @patch("consultations_core.services.procedure_service.Procedure.objects")
    def test_persist_procedures_none_text_delete_only(self, proc_objects):
        consultation = SimpleNamespace(id="c1")
        persist_procedures(consultation, None, SimpleNamespace())
        proc_objects.filter.assert_called_once_with(consultation=consultation)
        proc_objects.filter.return_value.delete.assert_called_once()
        proc_objects.create.assert_not_called()


class EndConsultationFollowUpPersistenceTests(SimpleTestCase):
    @patch("consultations_core.services.end_consultation_service.FollowUp.objects")
    def test_persist_follow_up_none_skips_delete(self, fu_objects):
        consultation = SimpleNamespace(id="c1")
        _persist_follow_up(consultation, SimpleNamespace(), None)
        fu_objects.filter.assert_not_called()

    @patch("consultations_core.services.end_consultation_service.FollowUp.objects")
    def test_persist_follow_up_cleared_deletes(self, fu_objects):
        consultation = SimpleNamespace(id="c1")
        cleared = {
            "date": None,
            "interval": 0,
            "unit": "days",
            "reason": "",
            "early_if_persist": False,
        }
        _persist_follow_up(consultation, SimpleNamespace(), cleared)
        fu_objects.filter.assert_called_once_with(consultation=consultation)
        fu_objects.filter.return_value.delete.assert_called_once()
        fu_objects.create.assert_not_called()

    @patch("consultations_core.services.end_consultation_service.FollowUp.objects")
    def test_persist_follow_up_notes_only_raises(self, fu_objects):
        consultation = SimpleNamespace(id="c1")
        bad = {
            "date": None,
            "interval": 0,
            "unit": "days",
            "reason": "needs follow-up",
            "early_if_persist": False,
        }
        with self.assertRaises(ValidationError):
            _persist_follow_up(consultation, SimpleNamespace(), bad)
        fu_objects.create.assert_not_called()
