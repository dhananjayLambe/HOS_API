"""Tests for prepare_prescription_whatsapp background orchestration."""

import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from clinic.models import Clinic
from consultations_core.models.consultation import Consultation
from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import Prescription, PrescriptionStatus
from consultations_core.services.encounter_service import EncounterService
from doctor.models import doctor as DoctorModel
from medicines.models import DrugMaster
from medicines.models.choices import DrugType
from medicines.models.masters import FormulationMaster
from notifications.models.whatsapp_notifications import WhatsAppMessage, WhatsAppMessageStatus
from notifications.services.delivery.prescription_whatsapp_orchestrator import (
    run_prepare_and_enqueue,
    run_prepare_consultation_and_enqueue,
)
from notifications.tasks import prepare_prescription_whatsapp
from patient_account.models import PatientAccount, PatientProfile
from tests.helpers.media_root import IsolatedMediaRootMixin
from tests.helpers.medicine_masters import ensure_autofill_route_and_dose_masters
from tests.helpers.payloads import end_consultation_payload

User = get_user_model()


def _doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    u = User.objects.create_user(
        username=f"doc_prep_{uuid.uuid4().hex[:10]}",
        password="testpass123",
    )
    u.groups.add(g)
    client = APIClient()
    client.force_authenticate(user=u)
    return client, u


class PreparePrescriptionOrchestratorTests(IsolatedMediaRootMixin, TestCase):
    def setUp(self):
        ensure_autofill_route_and_dose_masters()
        self.client, self.doctor_user = _doctor_client()
        self.clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
        self.doc_profile, _ = DoctorModel.objects.get_or_create(
            user=self.doctor_user,
            defaults={"primary_specialization": "General"},
        )
        self.doc_profile.clinics.add(self.clinic)

        self.patient_user = User.objects.create_user(
            username="9876543210",
            password="testpass123",
        )
        self.patient_account = PatientAccount.objects.create(user=self.patient_user)
        self.patient_account.clinics.add(self.clinic)
        self.patient_profile = PatientProfile.objects.create(
            account=self.patient_account,
            first_name="John",
            last_name="Doe",
            relation="self",
            gender="male",
            age_years=30,
        )

        formulation = FormulationMaster.objects.create(name=f"tab-{uuid.uuid4().hex[:8]}")
        self.drug_master = DrugMaster.objects.create(
            code=f"RX-{uuid.uuid4().hex[:10]}",
            brand_name="Dolo 650",
            generic_name="Paracetamol",
            drug_type=DrugType.TABLET,
            formulation=formulation,
            is_active=True,
        )
        self.prescription = self._finalize_prescription()

    def _finalize_prescription(self):
        encounter = EncounterService.create_encounter(
            clinic=self.clinic,
            patient_account=self.patient_account,
            patient_profile=self.patient_profile,
            doctor=self.doc_profile,
            created_by=self.doctor_user,
        )
        Consultation.objects.create(encounter=encounter)
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(status="consultation_in_progress")
        encounter.refresh_from_db()

        url = reverse("consultation-complete", kwargs={"encounter_id": encounter.id})
        response = self.client.post(
            url,
            end_consultation_payload(drug_id=self.drug_master.id),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)

        return Prescription.objects.filter(
            consultation=encounter.consultation,
            is_active=True,
            status=PrescriptionStatus.FINALIZED,
        ).first()

    @override_settings(
        PRESCRIPTION_DOWNLOAD_BASE_URL="https://doctorprocare.com",
        WHATSAPP_USE_SIMULATED_PROVIDER=True,
    )
    @patch("notifications.services.delivery.prescription_whatsapp_orchestrator.generate_and_persist_prescription_pdf")
    def test_orchestrator_skips_when_pdf_missing(self, mock_pdf):
        mock_pdf.return_value = False
        message_id = run_prepare_and_enqueue(
            prescription_id=str(self.prescription.id),
            initiated_by_id=str(self.doctor_user.id),
        )
        self.assertIsNone(message_id)
        skipped = WhatsAppMessage.objects.filter(
            prescription_id=self.prescription.id,
            status=WhatsAppMessageStatus.SKIPPED,
        ).exists()
        self.assertTrue(skipped)

    @override_settings(WHATSAPP_USE_SIMULATED_PROVIDER=True)
    @patch("notifications.tasks.send_prescription_whatsapp.delay")
    @patch("notifications.services.delivery.prescription_whatsapp_orchestrator.generate_and_persist_prescription_pdf")
    def test_prepare_task_chains_send_on_success(self, mock_pdf, mock_send_delay):
        mock_pdf.return_value = True
        Prescription.objects.filter(pk=self.prescription.pk).update(pdf_file="prescriptions/test.pdf")
        self.prescription.refresh_from_db()
        prepare_prescription_whatsapp(
            str(self.prescription.id),
            str(self.doctor_user.id),
            "/",
        )
        self.assertTrue(mock_send_delay.called)


class PrepareConsultationOrchestratorTests(IsolatedMediaRootMixin, TestCase):
    """WhatsApp when consultation ends without medicines (no prescription)."""

    def setUp(self):
        ensure_autofill_route_and_dose_masters()
        self.client, self.doctor_user = _doctor_client()
        self.clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
        self.doc_profile, _ = DoctorModel.objects.get_or_create(
            user=self.doctor_user,
            defaults={"primary_specialization": "General"},
        )
        self.doc_profile.clinics.add(self.clinic)

        self.patient_user = User.objects.create_user(
            username="9876543299",
            password="testpass123",
        )
        self.patient_account = PatientAccount.objects.create(user=self.patient_user)
        self.patient_account.clinics.add(self.clinic)
        self.patient_profile = PatientProfile.objects.create(
            account=self.patient_account,
            first_name="Empty",
            last_name="Rx",
            relation="self",
            gender="male",
            age_years=40,
        )

        encounter = EncounterService.create_encounter(
            clinic=self.clinic,
            patient_account=self.patient_account,
            patient_profile=self.patient_profile,
            doctor=self.doc_profile,
            created_by=self.doctor_user,
        )
        self.consultation = Consultation.objects.create(encounter=encounter)
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(status="consultation_in_progress")
        self.encounter = encounter

        url = reverse("consultation-complete", kwargs={"encounter_id": encounter.id})
        response = self.client.post(url, end_consultation_payload(), format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.consultation.refresh_from_db()

    @override_settings(WHATSAPP_USE_SIMULATED_PROVIDER=True)
    def test_orchestrator_queues_without_prescription(self):
        self.assertFalse(
            Prescription.objects.filter(
                consultation_id=self.consultation.id,
                status=PrescriptionStatus.FINALIZED,
            ).exists()
        )
        message_id = run_prepare_consultation_and_enqueue(
            consultation_id=str(self.consultation.id),
            initiated_by_id=str(self.doctor_user.id),
        )
        self.assertIsNotNone(message_id)
        message = WhatsAppMessage.objects.get(pk=message_id)
        self.assertEqual(message.status, WhatsAppMessageStatus.QUEUED)
        self.assertIsNone(message.prescription_id)
        components = (message.request_payload or {}).get("template_components") or {}
        self.assertEqual(components.get("medicine_block"), "No medicines prescribed.")
        self.assertEqual(components.get("test_block"), "No tests advised")

    @override_settings(WHATSAPP_USE_SIMULATED_PROVIDER=True)
    def test_orchestrator_queues_tests_only_without_prescription(self):
        from consultations_core.services.investigation_api_service import (
            add_investigation_item,
            get_or_create_investigations_container,
        )
        from consultations_core.models.investigation import InvestigationSource

        container = get_or_create_investigations_container(self.consultation)
        add_investigation_item(
            container=container,
            source=InvestigationSource.CUSTOM,
            user=self.doctor_user,
            adhoc_name="Complete Blood Count",
            adhoc_type="lab",
        )

        message_id = run_prepare_consultation_and_enqueue(
            consultation_id=str(self.consultation.id),
            initiated_by_id=str(self.doctor_user.id),
        )
        self.assertIsNotNone(message_id)
        message = WhatsAppMessage.objects.get(pk=message_id)
        self.assertEqual(message.status, WhatsAppMessageStatus.QUEUED)
        self.assertIsNone(message.prescription_id)
        components = (message.request_payload or {}).get("template_components") or {}
        self.assertEqual(components.get("medicine_block"), "No medicines prescribed.")
        self.assertEqual(components.get("test_block"), "Complete Blood Count")

        from notifications.services.presentation.whatsapp_status import (
            get_consultation_delivery_whatsapp_status,
        )

        status_payload = get_consultation_delivery_whatsapp_status(self.consultation)
        self.assertIsNotNone(status_payload)
        self.assertEqual(status_payload["status"], "queued")


class EndConsultationNonBlockingTests(IsolatedMediaRootMixin, TestCase):
    def setUp(self):
        ensure_autofill_route_and_dose_masters()
        self.client, self.doctor_user = _doctor_client()
        self.clinic = Clinic.objects.create(name=f"Clinic {uuid.uuid4().hex[:6]}")
        self.doc_profile, _ = DoctorModel.objects.get_or_create(
            user=self.doctor_user,
            defaults={"primary_specialization": "General"},
        )
        self.doc_profile.clinics.add(self.clinic)

        self.patient_user = User.objects.create_user(
            username="9876543211",
            password="testpass123",
        )
        self.patient_account = PatientAccount.objects.create(user=self.patient_user)
        self.patient_account.clinics.add(self.clinic)
        self.patient_profile = PatientProfile.objects.create(
            account=self.patient_account,
            first_name="Jane",
            last_name="Doe",
            relation="self",
            gender="female",
            age_years=28,
        )

        formulation = FormulationMaster.objects.create(name=f"tab-{uuid.uuid4().hex[:8]}")
        self.drug_master = DrugMaster.objects.create(
            code=f"RX-{uuid.uuid4().hex[:10]}",
            brand_name="Dolo 650",
            generic_name="Paracetamol",
            drug_type=DrugType.TABLET,
            formulation=formulation,
            is_active=True,
        )

        encounter = EncounterService.create_encounter(
            clinic=self.clinic,
            patient_account=self.patient_account,
            patient_profile=self.patient_profile,
            doctor=self.doc_profile,
            created_by=self.doctor_user,
        )
        Consultation.objects.create(encounter=encounter)
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(status="consultation_in_progress")
        self.encounter = encounter

    @patch("notifications.tasks.prepare_consultation_whatsapp.delay")
    def test_end_consultation_succeeds_when_prepare_enqueue_raises(self, mock_delay):
        mock_delay.side_effect = RuntimeError("broker down")
        url = reverse("consultation-complete", kwargs={"encounter_id": self.encounter.id})
        response = self.client.post(
            url,
            end_consultation_payload(drug_id=self.drug_master.id),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data.get("status"), "success")
