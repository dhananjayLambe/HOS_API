"""Production readiness tests for M4.3/4.4 diagnostic recommendation WhatsApp."""

from __future__ import annotations

import time
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from consultations_core.models.encounter import ClinicalEncounter
from consultations_core.models.prescription import PrescriptionStatus
from diagnostics_engine.domain.recommendation import (
    ExpandedTestLine,
    LabRecommendationService,
    RecommendationFailureReason,
    RecommendationResult,
)
from diagnostics_engine.models import DiagnosticCategory, DiagnosticOrder, DiagnosticServiceMaster
from diagnostics_engine.models.routing import RoutingRun
from diagnostics_engine.tests.test_lab_recommendation_service import _clinic_with_pincode, _lab_org_branch_area
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
from notifications.services.monitoring.recommendation_metrics import (
    get_recommendation_whatsapp_metrics,
    serialize_recommendation_message,
)
from notifications.tasks import _enqueue_diagnostic_recommendation_if_enabled
from patient_account.models import PatientAccount, PatientProfile
from tests.helpers.media_root import IsolatedMediaRootMixin

User = get_user_model()


def _available_result(consultation_id, branch, lab, *, collection_mode="lab", savings=Decimal("200")):
    quoted = Decimal("800")
    mrp = quoted + savings
    return RecommendationResult(
        available=True,
        failure_reason=None,
        consultation_id=consultation_id,
        recommended_lab=lab,
        recommended_branch=branch,
        collection_mode=collection_mode,
        expanded_tests=[
            ExpandedTestLine(
                service_id="svc-1",
                code="CBC",
                name="Complete Blood Count",
                quantity=1,
                investigation_item_id="inv-1",
            )
        ],
        quoted_price=quoted,
        mrp_total=mrp,
        savings=savings,
    )


@override_settings(
    WHATSAPP_USE_SIMULATED_PROVIDER=True,
    WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED=True,
    WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_NAME="diagnostic_test_recommendation_v3",
    WHATSAPP_DIAGNOSTIC_RECOMMENDATION_TEMPLATE_BODY_PARAM_KEYS=(
        "patient_name,test_names,mrp,quoted_price,savings"
    ),
)
class DiagnosticRecommendationProductionReadinessTests(IsolatedMediaRootMixin, TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.clinic = _clinic_with_pincode()
        cls.user, cls.doc = _doctor_user_and_profile(cls.clinic)
        cls.cat = DiagnosticCategory.objects.create(
            name=f"Prod {uuid.uuid4().hex[:6]}",
            code=f"PRD-{uuid.uuid4().hex[:6]}",
        )
        cls.svc = DiagnosticServiceMaster.objects.create(
            code=f"prd_{uuid.uuid4().hex[:6]}",
            name="CBC",
            category=cls.cat,
            home_collection_possible=True,
        )
        cls.org, cls.branch = _lab_org_branch_area()
        _pricing(cls.branch, cls.svc, None)

    def setUp(self):
        g, _ = Group.objects.get_or_create(name="doctor")
        self.doc.user.groups.add(g)
        self.patient_user = User.objects.create_user(
            username=f"9{uuid.uuid4().hex[:9]}",
            password="testpass123",
        )
        self.patient_account = PatientAccount.objects.create(user=self.patient_user)
        self.patient_account.clinics.add(self.clinic)
        self.patient_profile = PatientProfile.objects.create(
            account=self.patient_account,
            first_name="Test",
            last_name="Patient",
            relation="self",
            gender="male",
            age_years=30,
        )

    def _consultation(self, *, with_catalog=True):
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

    def _prescription_message(self, consultation, encounter, *, status=WhatsAppMessageStatus.SENT):
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
            recipient_name="Test Patient",
            idempotency_key=f"prescription_{prescription.id}",
        )
        message.mark_status(status)
        if status == WhatsAppMessageStatus.SENT:
            message.meta_message_id = "wamid.prescription"
            message.save(update_fields=["meta_message_id", "updated_at"])
        return message

    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_recommendation_metadata_persisted_for_m5(self, mock_recommend):
        consultation, _ = self._consultation()
        mock_recommend.return_value = _available_result(consultation.pk, self.branch, self.org)

        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        message = WhatsAppMessage.objects.get(pk=message_id)
        metadata = message.request_payload["recommendation_metadata"]
        self.assertIn("recommendation_id", metadata)
        self.assertIn("generated_at", metadata)
        self.assertIn("expires_at", metadata)
        self.assertEqual(metadata["collection_mode"], "lab")
        self.assertIsNotNone(metadata["recommended_branch"])
        self.assertEqual(metadata["quoted_price"], "800")

        audit = serialize_recommendation_message(message)
        self.assertEqual(audit["consultation_id"], str(consultation.id))
        self.assertIsNotNone(audit["encounter_id"])
        self.assertEqual(audit["template_name"], "diagnostic_test_recommendation_v3")

    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_no_booking_side_effects(self, mock_recommend):
        consultation, _ = self._consultation()
        mock_recommend.return_value = _available_result(consultation.pk, self.branch, self.org)
        orders_before = DiagnosticOrder.objects.count()
        routing_before = RoutingRun.objects.count()

        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        WhatsAppService().send_recommendation_message(message_id=message_id)

        self.assertEqual(DiagnosticOrder.objects.count(), orders_before)
        self.assertEqual(RoutingRun.objects.count(), routing_before)
        message = WhatsAppMessage.objects.get(pk=message_id)
        self.assertIsNone(message.diagnostic_order_id)

    @patch("notifications.tasks.prepare_diagnostic_recommendation_whatsapp.delay")
    def test_sequencing_recommendation_only_after_prescription_sent(self, mock_delay):
        consultation, encounter = self._consultation()
        queued = self._prescription_message(consultation, encounter, status=WhatsAppMessageStatus.QUEUED)
        _enqueue_diagnostic_recommendation_if_enabled(queued)
        mock_delay.assert_not_called()

        sent = self._prescription_message(consultation, encounter, status=WhatsAppMessageStatus.SENT)
        _enqueue_diagnostic_recommendation_if_enabled(sent)
        mock_delay.assert_called_once()

    @override_settings(WHATSAPP_DIAGNOSTIC_RECOMMENDATION_ENABLED=False)
    @patch("notifications.tasks.prepare_diagnostic_recommendation_whatsapp.delay")
    def test_feature_flag_disables_recommendation_chain(self, mock_delay):
        consultation, encounter = self._consultation()
        message = self._prescription_message(consultation, encounter)
        _enqueue_diagnostic_recommendation_if_enabled(message)
        mock_delay.assert_not_called()

    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_duplicate_end_consultation_one_recommendation(self, mock_recommend):
        consultation, _ = self._consultation()
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
                message_type=WhatsAppMessageType.TEST_BOOKING,
                idempotency_key=f"diagnostic_recommendation_{consultation.id}",
            ).count(),
            1,
        )

    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_zero_savings_uses_flat_pricing_mode(self, mock_recommend):
        consultation, _ = self._consultation()
        mock_recommend.return_value = _available_result(
            consultation.pk,
            self.branch,
            self.org,
            savings=Decimal("0"),
        )

        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        message = WhatsAppMessage.objects.get(pk=message_id)
        self.assertEqual(message.request_payload["pricing_display_mode"], "flat")
        self.assertIn("Price: ₹800", message.request_payload["rendered_body"])
        self.assertNotIn("You Save", message.request_payload["rendered_body"])

    @patch("notifications.services.delivery.whatsapp_service.MetaWhatsAppClient.send_text_message")
    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_recommendation_failure_does_not_affect_prescription(self, mock_recommend, mock_text):
        from notifications.services.delivery.meta_client import MetaWhatsAppError

        consultation, encounter = self._consultation()
        mock_recommend.return_value = _available_result(consultation.pk, self.branch, self.org)
        mock_text.side_effect = MetaWhatsAppError(code="131000", message="Meta down")

        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        rec = WhatsAppService().send_recommendation_message(message_id=message_id)
        self.assertEqual(rec.status, WhatsAppMessageStatus.FAILED)

        rx = WhatsAppMessage.objects.filter(
            message_type=WhatsAppMessageType.PRESCRIPTION,
            encounter=encounter,
        ).first()
        if rx:
            self.assertNotEqual(rx.status, WhatsAppMessageStatus.FAILED)

    @patch(
        "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
        "LabRecommendationService.recommend"
    )
    def test_unavailable_recommendation_plain_text(self, mock_recommend):
        consultation, _ = self._consultation()
        mock_recommend.return_value = RecommendationResult(
            available=False,
            failure_reason=RecommendationFailureReason.NO_ELIGIBLE_LABORATORY,
            consultation_id=consultation.pk,
            collection_mode="lab",
        )
        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        sent = WhatsAppService().send_recommendation_message(message_id=message_id)
        self.assertEqual(sent.status, WhatsAppMessageStatus.SENT)
        self.assertIn("Sorry.", sent.request_payload.get("rendered_body", ""))

    def test_custom_investigations_only_skips_whatsapp(self):
        consultation, _ = self._consultation(with_catalog=False)
        message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
        self.assertIsNone(message_id)
        self.assertFalse(
            WhatsAppMessage.objects.filter(
                message_type=WhatsAppMessageType.TEST_BOOKING,
                idempotency_key=f"diagnostic_recommendation_{consultation.id}",
            ).exists()
        )

    def test_recommendation_generation_performance_budget(self):
        consultation, _ = self._consultation()
        started = time.monotonic()
        run_prepare_and_enqueue(consultation_id=str(consultation.id))
        elapsed_ms = int((time.monotonic() - started) * 1000)
        self.assertLess(elapsed_ms, 2000, f"prepare took {elapsed_ms}ms")

    def test_metrics_endpoint_returns_funnel_counts(self):
        consultation, _ = self._consultation()
        with patch(
            "notifications.services.delivery.diagnostic_recommendation_whatsapp_orchestrator."
            "LabRecommendationService.recommend"
        ) as mock_recommend:
            mock_recommend.return_value = _available_result(consultation.pk, self.branch, self.org)
            message_id = run_prepare_and_enqueue(consultation_id=str(consultation.id))
            WhatsAppService().send_recommendation_message(message_id=message_id)

        metrics = get_recommendation_whatsapp_metrics(days=1)
        self.assertGreaterEqual(metrics["recommendations_generated"], 1)
        self.assertGreaterEqual(metrics["recommendations_sent"], 1)

        client = APIClient()
        client.force_authenticate(user=self.doc.user)
        response = client.get("/api/v1/notifications/whatsapp/recommendations/metrics/?days=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("recommendations_sent", response.data)

    def test_real_recommendation_matches_routing_engine(self):
        consultation, _ = self._consultation()
        result = LabRecommendationService.recommend(consultation=consultation)
        self.assertTrue(result.available)
        self.assertEqual(result.recommended_branch.pk, self.branch.pk)
        self.assertIsNotNone(result.quoted_price)
