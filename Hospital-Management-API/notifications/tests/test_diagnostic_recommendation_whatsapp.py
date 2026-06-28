"""Tests for diagnostic recommendation WhatsApp orchestration (M4.3/4.4)."""

from __future__ import annotations

import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings

from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import PrescriptionStatus
from diagnostics_engine.domain.recommendation import (
    ExpandedTestLine,
    LabRecommendationService,
    RecommendationFailureReason,
    RecommendationResult,
)
from diagnostics_engine.models import DiagnosticCategory, DiagnosticServiceMaster
from diagnostics_engine.tests.test_lab_recommendation_service import (
    _clinic_with_pincode,
    _lab_org_branch_area,
)
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _pricing,
)
from notifications.models.whatsapp_notifications import (
    WhatsAppConversationCategory,
    WhatsAppMessage,
    WhatsAppMessageStatus,
    WhatsAppMessageType,
    WhatsAppProvider,
)
from notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator import (
    run_prepare_and_enqueue,
)
from notifications.services.delivery.whatsapp_service import WhatsAppService
from notifications.tasks import _enqueue_diagnostic_recommendation_if_enabled
from patient_account.models import PatientAccount, PatientProfile
from tests.helpers.media_root import IsolatedMediaRootMixin

User = get_user_model()


def _available_result(consultation_id, branch, lab) -> RecommendationResult:
    return RecommendationResult(
        available=True,
        failure_reason=None,
        consultation_id=consultation_id,
        recommended_lab=lab,
        recommended_branch=branch,
        collection_mode="lab",
        expanded_tests=[
            ExpandedTestLine(
                service_id="svc-1",
                code="CBS",
                name="CBS",
                quantity=1,
                investigation_item_id="inv-1",
            )
        ],
        quoted_price=Decimal("600"),
        mrp_total=Decimal("1000"),
        savings=Decimal("400"),
    )


def _unavailable_result(consultation_id) -> RecommendationResult:
    return RecommendationResult(
        available=False,
        failure_reason=RecommendationFailureReason.NO_ELIGIBLE_LABORATORY,
        consultation_id=consultation_id,
        recommended_lab=None,
        recommended_branch=None,
        collection_mode="lab",
    )


@override_settings(
    WHATSAPP_USE_SIMULATED_PROVIDER=True,
    WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED=True,
    WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_NAME="diagnostic_test_recommendation_v3",
    WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_BODY_PARAM_KEYS=(
        "patient_name,test_names,mrp,quoted_price,savings"
    ),
)
class DiagnosticRecommendationWhatsAppTests(IsolatedMediaRootMixin, TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.clinic = _clinic_with_pincode()
        cls.user, cls.doc = _doctor_user_and_profile(cls.clinic)
        cls.cat = DiagnosticCategory.objects.create(
            name=f"Rec WA {uuid.uuid4().hex[:6]}",
            code=f"RWA-{uuid.uuid4().hex[:6]}",
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"rec_wa_{uuid.uuid4().hex[:6]}",
            name="CBS",
            category=cls.cat,
            home_collection_possible=True,
        )
        cls.org, cls.branch = _lab_org_branch_area()
        from diagnostics_engine.models import DiagnosticPackage, DiagnosticPackageItem

        cls.pkg = DiagnosticPackage.objects.create(
            lineage_code=f"ln_wa_{uuid.uuid4().hex[:6]}",
            version=1,
            is_latest=True,
            name="WA Pkg",
            category=cls.cat,
        )
        DiagnosticPackageItem.objects.create(
            package=cls.pkg,
            service=cls.svc,
            quantity=1,
            is_mandatory=True,
            display_order=1,
        )
        _pricing(cls.branch, cls.svc, cls.pkg)

    def setUp(self):
        g, _ = Group.objects.get_or_create(name="doctor")
        self.doc.user.groups.add(g)

        self.patient_user = User.objects.create_user(
            username="9876543210",
            password="testpass123",
        )
        self.patient_account = PatientAccount.objects.create(user=self.patient_user)
        self.patient_account.clinics.add(self.clinic)
        self.patient_profile = PatientProfile.objects.create(
            account=self.patient_account,
            first_name="Dhananjay",
            last_name="lambe",
            relation="self",
            gender="male",
            age_years=30,
        )

    def _consultation_with_phone(self, *, with_catalog: bool = True):
        consultation, encounter, _, _, _, _ = _consultation_with_investigations(
            self.user,
            self.doc,
            with_catalog=with_catalog,
            with_package=False,
            svc=self.svc,
        )
        ClinicalEncounter.objects.filter(pk=encounter.pk).update(
            clinic=self.clinic,
            patient_profile=self.patient_profile,
            patient_account=self.patient_account,
        )
        encounter.refresh_from_db()
        return consultation, encounter

    def _prescription_message(self, consultation, encounter):
        from consultations_core.models.prescription import Prescription

        prescription = Prescription.objects.filter(
            consultation_id=consultation.id,
            status=PrescriptionStatus.FINALIZED,
            is_active=True,
        ).first()
        message = WhatsAppMessage.objects.create(
            provider=WhatsAppProvider.META,
            conversation_category=WhatsAppConversationCategory.UTILITY,
            message_type=WhatsAppMessageType.PRESCRIPTION,
            status=WhatsAppMessageStatus.QUEUED,
            patient=self.patient_profile,
            clinic=encounter.clinic,
            doctor=encounter.doctor,
            encounter=encounter,
            prescription=prescription,
            recipient_mobile_number="919876543210",
            recipient_name="Dhananjay lambe",
            idempotency_key=f"prescription_{consultation.id}",
        )
        message.mark_status(WhatsAppMessageStatus.SENT)
        message.meta_message_id = "wamid.test"
        message.save(update_fields=["meta_message_id", "updated_at"])
        return message

    @patch("notifications.tasks.prepare_diagnostic_recommendation_whatsapp.delay")
    def test_prescription_sent_chains_recommendation_prepare(self, mock_delay):
        consultation, encounter = self._consultation_with_phone()
        message = self._prescription_message(consultation, encounter)
        _enqueue_diagnostic_recommendation_if_enabled(message)
        mock_delay.assert_called_once_with(str(consultation.id), str(message.id))

    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_no_investigations_skips_recommendation_prepare(self, mock_recommend):
        consultation, _ = self._consultation_with_phone(with_catalog=False)
        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        self.assertIsNone(message_id)
        mock_recommend.assert_not_called()

    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_available_recommendation_queues_template_message(self, mock_recommend):
        consultation, _ = self._consultation_with_phone()
        mock_recommend.return_value = _available_result(consultation.pk, self.branch, self.org)

        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        self.assertIsNotNone(message_id)

        message = WhatsAppMessage.objects.get(pk=message_id)
        self.assertEqual(message.message_type, WhatsAppMessageType.TEST_BOOKING)
        self.assertEqual(message.status, WhatsAppMessageStatus.QUEUED)
        self.assertEqual(message.request_payload["variant"], "available")
        self.assertEqual(message.template_name, "diagnostic_test_recommendation_v3")

        sent = WhatsAppService().send_recommendation_message(message_id=message_id)
        self.assertEqual(sent.status, WhatsAppMessageStatus.SENT)
        self.assertTrue((sent.meta_message_id or "").startswith("sim-wa-"))
        components = sent.request_payload.get("template_components") or {}
        self.assertEqual(components.get("patient_name"), "Dhananjay lambe")
        self.assertIn("CBS", components.get("test_names", ""))
        self.assertEqual(components.get("mrp"), "1000")
        self.assertEqual(components.get("quoted_price"), "600")
        self.assertEqual(components.get("savings"), "400")

    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_unavailable_sends_plain_text_sorry(self, mock_recommend):
        consultation, _ = self._consultation_with_phone()
        mock_recommend.return_value = _unavailable_result(consultation.pk)

        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        message = WhatsAppMessage.objects.get(pk=message_id)
        self.assertEqual(message.request_payload["variant"], "unavailable")

        sent = WhatsAppService().send_recommendation_message(message_id=message_id)
        self.assertEqual(sent.status, WhatsAppMessageStatus.SENT)
        self.assertIn("Sorry.", sent.request_payload.get("rendered_body", ""))

    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_idempotency_prevents_duplicate_recommendation(self, mock_recommend):
        consultation, _ = self._consultation_with_phone()
        mock_recommend.return_value = _available_result(consultation.pk, self.branch, self.org)

        first_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        WhatsAppMessage.objects.filter(pk=first_id).update(
            status=WhatsAppMessageStatus.SENT,
            meta_message_id="wamid.rec",
        )
        second_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        self.assertIsNone(second_id)
        self.assertEqual(
            WhatsAppMessage.objects.filter(
                idempotency_key=f"diagnostic_recommendation_{consultation.id}",
                is_deleted=False,
            ).count(),
            1,
        )

    @patch("notifications.services.delivery.whatsapp_service.MetaWhatsAppClient.send_recommendation_template")
    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_meta_failure_marks_message_failed(self, mock_recommend, mock_send):
        from notifications.services.delivery.meta_client import MetaWhatsAppError

        consultation, _ = self._consultation_with_phone()
        mock_recommend.return_value = _available_result(consultation.pk, self.branch, self.org)
        mock_send.side_effect = MetaWhatsAppError(code="131000", message="Meta down")

        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        sent = WhatsAppService().send_recommendation_message(message_id=message_id)
        self.assertEqual(sent.status, WhatsAppMessageStatus.FAILED)

    def test_integration_with_real_recommendation_service(self):
        consultation, _ = self._consultation_with_phone()
        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        self.assertIsNotNone(message_id)
        message = WhatsAppMessage.objects.get(pk=message_id)
        self.assertIn(message.request_payload["variant"], ("available", "unavailable"))
