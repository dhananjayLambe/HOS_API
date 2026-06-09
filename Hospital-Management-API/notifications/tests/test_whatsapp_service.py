"""Tests for WhatsAppService prescription delivery."""

import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
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
from notifications.models.whatsapp_notifications import (
    WhatsAppConversationCategory,
    WhatsAppMessage,
    WhatsAppMessageStatus,
    WhatsAppMessageType,
    WhatsAppProvider,
)
from notifications.services.delivery.whatsapp_service import WhatsAppService
from patient_account.models import PatientAccount, PatientProfile
from tests.helpers.medicine_masters import ensure_autofill_route_and_dose_masters
from tests.helpers.payloads import end_consultation_payload

User = get_user_model()


def _doctor_client():
    g, _ = Group.objects.get_or_create(name="doctor")
    u = User.objects.create_user(
        username=f"doc_wa_{uuid.uuid4().hex[:10]}",
        password="testpass123",
        first_name="Dhananjay",
        last_name="Lambe",
    )
    u.groups.add(g)
    client = APIClient()
    client.force_authenticate(user=u)
    return client, u


class WhatsAppServiceTests(TestCase):
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
            first_name="John",
            last_name="Doe",
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

        prescription = Prescription.objects.filter(
            consultation=encounter.consultation,
            is_active=True,
            status=PrescriptionStatus.FINALIZED,
        ).first()
        self.assertIsNotNone(prescription)
        prescription.pdf_file.save("test.pdf", ContentFile(b"%PDF-1.4 test"), save=False)
        Prescription.objects.filter(pk=prescription.pk).update(pdf_file=prescription.pdf_file.name)
        prescription.refresh_from_db()
        return prescription

    @override_settings(
        PRESCRIPTION_DOWNLOAD_BASE_URL="https://doctorprocare.com",
        WHATSAPP_PRESCRIPTION_TEMPLATE_NAME="prescription_ready_v1",
    )
    def test_prepare_creates_queued_message_with_payload(self):
        message = WhatsAppService().prepare_prescription_delivery(
            prescription=self.prescription,
            initiated_by=self.doctor_user,
        )
        self.assertEqual(message.status, WhatsAppMessageStatus.QUEUED)
        self.assertEqual(message.recipient_mobile_number, "919876543210")
        self.assertIn("medicine_summary", message.request_payload)
        self.assertIn("rendered_body", message.request_payload)

    def test_prepare_skips_without_phone(self):
        self.patient_user.username = "   "
        self.patient_user.save(update_fields=["username"])
        message = WhatsAppService().prepare_prescription_delivery(
            prescription=self.prescription,
            initiated_by=self.doctor_user,
        )
        self.assertEqual(message.status, WhatsAppMessageStatus.SKIPPED)
        self.assertEqual(message.failure_reason, "No mobile number")

    @override_settings(
        PRESCRIPTION_DOWNLOAD_BASE_URL="https://doctorprocare.com",
        WHATSAPP_PRESCRIPTION_TEMPLATE_NAME="prescription_ready_v1",
    )
    def test_resend_after_skipped_no_phone_queues_when_phone_added(self):
        self.patient_user.username = "   "
        self.patient_user.save(update_fields=["username"])
        skipped = WhatsAppService().prepare_prescription_delivery(
            prescription=self.prescription,
            initiated_by=self.doctor_user,
        )
        self.assertEqual(skipped.status, WhatsAppMessageStatus.SKIPPED)

        self.patient_user.username = "9876543210"
        self.patient_user.save(update_fields=["username"])
        resent = WhatsAppService().resend_prescription_delivery(
            prescription_id=self.prescription.id,
            initiated_by=self.doctor_user,
        )
        self.assertEqual(resent.status, WhatsAppMessageStatus.QUEUED)
        self.assertNotEqual(resent.id, skipped.id)

    def test_resend_api_rejects_unauthorized_doctor(self):
        self.patient_user.username = "   "
        self.patient_user.save(update_fields=["username"])
        WhatsAppService().prepare_prescription_delivery(
            prescription=self.prescription,
            initiated_by=self.doctor_user,
        )
        other_client, _ = _doctor_client()
        url = reverse("whatsapp-resend", kwargs={"prescription_id": self.prescription.id})
        response = other_client.post(url)
        self.assertEqual(response.status_code, 403)

    @override_settings(WHATSAPP_USE_SIMULATED_PROVIDER=True)
    def test_send_uses_stored_snapshot(self):
        message = WhatsAppService().prepare_prescription_delivery(
            prescription=self.prescription,
            initiated_by=self.doctor_user,
        )
        with patch(
            "consultations_core.services.prescription_summary_builder._build_prescriptions"
        ) as mock_build:
            sent = WhatsAppService().send_prescription_message(message_id=message.id)
            mock_build.assert_not_called()
        self.assertEqual(sent.status, WhatsAppMessageStatus.SENT)
        self.assertTrue(sent.meta_message_id)

    @override_settings(
        PRESCRIPTION_DOWNLOAD_BASE_URL="https://doctorprocare.com",
        WHATSAPP_PRESCRIPTION_TEMPLATE_NAME="prescription_ready_v1",
    )
    def test_prepare_requeues_existing_failed_message(self):
        first = WhatsAppService().prepare_prescription_delivery(
            prescription=self.prescription,
            initiated_by=self.doctor_user,
        )
        first.status = WhatsAppMessageStatus.FAILED
        first.failure_reason = "(#132018) template params"
        first.save(update_fields=["status", "failure_reason", "updated_at"])

        second = WhatsAppService().prepare_prescription_delivery(
            prescription=self.prescription,
            initiated_by=self.doctor_user,
        )
        self.assertEqual(second.id, first.id)
        self.assertEqual(second.status, WhatsAppMessageStatus.QUEUED)
        self.assertEqual(second.failure_reason, "")
        components = second.request_payload.get("template_components") or {}
        for value in components.values():
            self.assertNotIn("\n", value)

    def test_retry_normalizes_legacy_ten_digit_snapshot(self):
        encounter = self.prescription.consultation.encounter
        failed = WhatsAppMessage.objects.create(
            provider=WhatsAppProvider.META,
            conversation_category=WhatsAppConversationCategory.UTILITY,
            message_type=WhatsAppMessageType.PRESCRIPTION,
            status=WhatsAppMessageStatus.FAILED,
            patient=encounter.patient_profile,
            clinic=encounter.clinic,
            doctor=encounter.doctor,
            encounter=encounter,
            prescription=self.prescription,
            recipient_mobile_number="9876543210",
            failure_reason="(#131030) Recipient phone number not in allowed list",
            idempotency_key=f"prescription_{self.prescription.id}:failed:test",
        )

        retry_message = WhatsAppService().retry_delivery(
            message_id=failed.id,
            initiated_by=self.doctor_user,
        )
        self.assertEqual(retry_message.status, WhatsAppMessageStatus.QUEUED)
        self.assertEqual(retry_message.recipient_mobile_number, "919876543210")

    @override_settings(WHATSAPP_USE_SIMULATED_PROVIDER=True)
    def test_send_normalizes_legacy_ten_digit_snapshot(self):
        encounter = self.prescription.consultation.encounter
        message = WhatsAppMessage.objects.create(
            provider=WhatsAppProvider.META,
            conversation_category=WhatsAppConversationCategory.UTILITY,
            message_type=WhatsAppMessageType.PRESCRIPTION,
            status=WhatsAppMessageStatus.QUEUED,
            patient=encounter.patient_profile,
            clinic=encounter.clinic,
            doctor=encounter.doctor,
            encounter=encounter,
            prescription=self.prescription,
            recipient_mobile_number="9876543210",
            template_name="prescription_ready_v1",
            request_payload={"rendered_body": "Test", "template_components": []},
            idempotency_key=f"prescription_{self.prescription.id}:queued:test",
        )

        sent = WhatsAppService().send_prescription_message(message_id=message.id)
        sent.refresh_from_db()
        self.assertEqual(sent.status, WhatsAppMessageStatus.SENT)
        self.assertEqual(sent.recipient_mobile_number, "919876543210")
