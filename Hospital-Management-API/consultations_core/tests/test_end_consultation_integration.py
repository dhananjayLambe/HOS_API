"""
Integration tests: POST /api/consultations/encounter/<id>/consultation/complete/

Run report:
  ./venv/bin/python manage.py test consultations_core.tests.test_end_consultation_integration -v2

Verifies Consultation, ClinicalEncounter, and section persistence tables after end consultation.
"""

import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from clinic.models import Clinic
from consultations_core.models.consultation import Consultation
from consultations_core.models.diagnosis import ConsultationDiagnosis, CustomDiagnosis
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.instruction import (
    EncounterInstruction,
    InstructionCategory,
    InstructionTemplate,
)
from consultations_core.models.investigation import (
    CustomInvestigation,
    InvestigationItem,
    InvestigationSource,
)
from consultations_core.models.prescription import Prescription, PrescriptionLine
from consultations_core.models.symptoms import ConsultationSymptom
from consultations_core.services.encounter_service import EncounterService
from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)
from medicines.models import DrugMaster, DrugType, FormulationMaster
from patient_account.models import PatientAccount, PatientProfile

User = get_user_model()


def _doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    u = User.objects.create_user(
        username=f"doc_eci_{uuid.uuid4().hex[:10]}",
        password="testpass123",
        first_name="Doc",
        last_name="Test",
    )
    u.groups.add(g)
    client = APIClient()
    client.force_authenticate(user=u)
    return client, u


def _encounter_in_consultation(doctor_user):
    clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
    pu = User.objects.create_user(
        username=f"pat_eci_{uuid.uuid4().hex[:10]}",
        password="testpass123",
        first_name="Pat",
        last_name="Test",
    )
    pa = PatientAccount.objects.create(user=pu)
    pa.clinics.add(clinic)
    profile = PatientProfile.objects.create(account=pa, first_name="Pat", relation="self", gender="male")
    encounter = EncounterService.create_encounter(
        clinic=clinic,
        patient_account=pa,
        patient_profile=profile,
        created_by=doctor_user,
    )
    consultation = Consultation.objects.create(encounter=encounter)
    ClinicalEncounter.objects.filter(pk=encounter.pk).update(status="consultation_in_progress")
    encounter.refresh_from_db()
    return consultation, encounter, clinic


def _base_payload(**section_overrides):
    store = {
        "sectionItems": {
            "symptoms": [],
            "findings": [],
            "diagnosis": [],
            "medicines": [],
            "investigations": [],
            "instructions": [],
        },
        "draftFindings": [],
    }
    store["sectionItems"].update(section_overrides)
    return {"mode": "commit", "store": store}


class EndConsultationIntegrationTests(TestCase):
    """Scenarios 1–8 + rollback + idempotency from end-consultation DB verification plan."""

    @classmethod
    def setUpTestData(cls):
        cls.diag_cat = DiagnosticCategory.objects.create(
            name="Lab",
            code=f"LAB-ECI-{uuid.uuid4().hex[:8]}",
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"eci_{uuid.uuid4().hex[:6]}",
            name="ECI Catalog Test",
            category=cls.diag_cat,
        )
        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"eci_pkg_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            category=cls.diag_cat,
            name="ECI Package",
        )
        DiagnosticPackageItem.objects.create(package=cls.pkg, service=cls.svc)
        cls.form = FormulationMaster.objects.create(name="eci-form")
        cls.drug = DrugMaster.objects.create(
            code=f"ECI-DRUG-{uuid.uuid4().hex[:6]}",
            brand_name="ECI Paracetamol",
            formulation=cls.form,
            drug_type=DrugType.TABLET,
            is_active=True,
        )
        cls.inst_cat = InstructionCategory.objects.create(
            code=f"INST-CAT-{uuid.uuid4().hex[:8]}",
            name="General advice",
            display_order=0,
        )
        cls.instruction_tpl = InstructionTemplate.objects.create(
            key=f"eci_inst_{uuid.uuid4().hex[:8]}",
            label="Take adequate rest",
            category=cls.inst_cat,
            requires_input=False,
            input_schema={"fields": []},
        )

    def setUp(self):
        self.client, self.doctor_user = _doctor_client()
        self.consultation, self.encounter, self.clinic = _encounter_in_consultation(self.doctor_user)

    def _url(self):
        return reverse("consultation-complete", kwargs={"encounter_id": self.encounter.id})

    def _post_complete(self, payload):
        return self.client.post(self._url(), payload, format="json")

    def test_01_minimal_empty_sections_finalizes_encounter(self):
        r = self._post_complete(_base_payload())
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.consultation.refresh_from_db()
        self.encounter.refresh_from_db()
        self.assertTrue(self.consultation.is_finalized)
        self.assertIsNotNone(self.consultation.ended_at)
        self.assertEqual(self.encounter.status, "consultation_completed")
        self.assertFalse(self.encounter.is_active)
        self.assertEqual(InvestigationItem.objects.filter(investigations__consultation=self.consultation).count(), 0)

    def test_02_symptoms_persisted(self):
        payload = _base_payload(
            symptoms=[{"label": "Headache", "name": "Headache", "detail": {"note": "dull"}}],
        )
        r = self._post_complete(payload)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(self.consultation.symptoms.count(), 1)
        self.assertEqual(self.consultation.symptoms.first().display_name, "Headache")

    def test_03_findings_custom_persisted(self):
        payload = _base_payload()
        payload["store"]["draftFindings"] = [
            {
                "is_custom": True,
                "custom_name": "Skin rash",
                "note": "macular",
                "extension_data": {},
            }
        ]
        r = self._post_complete(payload)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        qs = self.consultation.findings.filter(is_active=True)
        self.assertEqual(qs.count(), 1)
        self.assertTrue(qs.first().is_custom)

    def test_04_diagnosis_custom_persisted(self):
        payload = _base_payload(
            diagnosis=[
                {
                    "label": "Custom DX",
                    "isCustom": True,
                    "is_custom": True,
                    "custom_name": "Custom DX",
                    "detail": {"notes": "note"},
                }
            ],
        )
        r = self._post_complete(payload)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(
            ConsultationDiagnosis.objects.filter(consultation=self.consultation, is_active=True).count(),
            1,
        )
        self.assertEqual(CustomDiagnosis.objects.filter(consultation=self.consultation).count(), 1)

    def test_05_medicines_prescription_and_lines(self):
        payload = _base_payload(
            medicines=[
                {
                    "detail": {
                        "medicine": {
                            "drug_id": str(self.drug.id),
                            "dose_value": 1,
                            "dose_unit_id": "tablet",
                            "route_id": "oral",
                            "frequency_id": "BD",
                            "duration_value": 3,
                            "duration_unit": "days",
                        }
                    }
                }
            ],
        )
        r = self._post_complete(payload)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        rx = Prescription.objects.filter(consultation=self.consultation, is_active=True).first()
        self.assertIsNotNone(rx)
        self.assertEqual(PrescriptionLine.objects.filter(prescription=rx).count(), 1)

    def test_06_investigations_catalog(self):
        payload = _base_payload(
            investigations=[
                {
                    "service_id": str(self.svc.id),
                    "name": self.svc.name,
                    "is_custom": False,
                    "label": self.svc.name,
                }
            ],
        )
        r = self._post_complete(payload)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        items = InvestigationItem.objects.filter(
            investigations__consultation=self.consultation,
            is_deleted=False,
        )
        self.assertEqual(items.count(), 1)
        self.assertEqual(items.first().source, InvestigationSource.CATALOG)

    def test_07_investigations_custom_creates_master_row(self):
        payload = _base_payload(
            investigations=[
                {
                    "service_id": f"custom-{uuid.uuid4()}",
                    "name": "Adhoc Custom Test",
                    "label": "Adhoc Custom Test",
                    "is_custom": True,
                    "detail": {"custom_investigation_type": "lab", "instructions": [], "notes": ""},
                }
            ],
        )
        r = self._post_complete(payload)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertTrue(
            CustomInvestigation.objects.filter(
                clinic=self.clinic,
                name__iexact="Adhoc Custom Test",
            ).exists()
        )
        items = InvestigationItem.objects.filter(
            investigations__consultation=self.consultation,
            is_deleted=False,
        )
        self.assertEqual(items.count(), 1)
        self.assertEqual(items.first().source, InvestigationSource.CUSTOM)

    def test_08_investigations_package(self):
        payload = _base_payload(
            investigations=[
                {
                    "bundle_id": str(self.pkg.id),
                    "diagnostic_package_id": str(self.pkg.id),
                    "name": self.pkg.name,
                    "is_custom": False,
                    "label": self.pkg.name,
                }
            ],
        )
        r = self._post_complete(payload)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        item = InvestigationItem.objects.filter(
            investigations__consultation=self.consultation,
            is_deleted=False,
        ).first()
        self.assertIsNotNone(item)
        self.assertEqual(item.source, InvestigationSource.PACKAGE)

    def test_09_validation_failure_rolls_back_all_persist(self):
        payload = _base_payload(
            symptoms=[{"label": "Cough", "name": "Cough", "detail": {}}],
            investigations=[
                {"source": "catalog"},
            ],
        )
        r = self._post_complete(payload)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.consultation.refresh_from_db()
        self.encounter.refresh_from_db()
        self.assertFalse(self.consultation.is_finalized)
        self.assertEqual(self.encounter.status, "consultation_in_progress")
        self.assertEqual(self.consultation.symptoms.count(), 0)

    def test_10_second_complete_returns_400(self):
        r1 = self._post_complete(_base_payload())
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.consultation.refresh_from_db()
        self.encounter.refresh_from_db()
        self.assertTrue(self.consultation.is_finalized)
        r2 = self._post_complete(_base_payload())
        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)
        err = r2.data.get("errors") or {}
        self.assertIn("encounter", err)

    def test_11_encounter_instructions_persisted_on_complete(self):
        payload = _base_payload(
            instructions=[
                {
                    "id": str(uuid.uuid4()),
                    "instruction_template_id": str(self.instruction_tpl.id),
                    "label": self.instruction_tpl.label,
                    "input_data": {},
                    "custom_note": None,
                    "is_active": True,
                }
            ],
        )
        r = self._post_complete(payload)
        self.assertEqual(r.status_code, status.HTTP_200_OK, getattr(r, "data", r.content))
        qs = EncounterInstruction.objects.filter(encounter=self.encounter, is_active=True)
        self.assertEqual(qs.count(), 1)
        row = qs.first()
        self.assertEqual(row.instruction_template_id, self.instruction_tpl.id)
