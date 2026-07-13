"""Unit tests for RecommendationPayloadBuilder."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.recommendation.constants import STAGE_DELIVERY, STAGE_GENERATION
from business_audit.recommendation.payload_builder import RecommendationPayloadBuilder
from business_audit.tests.recommendation.support import sample_result


class RecommendationPayloadBuilderTests(TestCase):
    def test_build_generated_includes_marketplace_metadata(self) -> None:
        result = sample_result()
        payload = RecommendationPayloadBuilder.build_generated(
            recommendation_id=str(uuid.uuid4()),
            consultation_id=str(uuid.uuid4()),
            patient_account_id="pa-1",
            patient_profile_id="pp-1",
            encounter_id="enc-1",
            result=result,
            source_path="marketplace_api",
        )
        self.assertEqual(payload["operational_stage"], "marketplace")
        self.assertEqual(payload["package_count"], 1)
        self.assertIn("CBC", payload["recommended_tests"])
        self.assertEqual(payload["marketplace"], "DoctorPro Marketplace")

    def test_build_generated_whatsapp_orchestrator_stage(self) -> None:
        payload = RecommendationPayloadBuilder.build_generated(
            recommendation_id=str(uuid.uuid4()),
            consultation_id=str(uuid.uuid4()),
            patient_account_id="pa-1",
            patient_profile_id="pp-1",
            encounter_id="enc-1",
            result=sample_result(),
            source_path="whatsapp_orchestrator",
        )
        self.assertEqual(payload["operational_stage"], STAGE_GENERATION)

    def test_build_sent_includes_meta_message_id(self) -> None:
        payload = RecommendationPayloadBuilder.build_sent(
            recommendation_id=str(uuid.uuid4()),
            consultation_id=str(uuid.uuid4()),
            patient_account_id="pa-1",
            patient_profile_id="pp-1",
            encounter_id="enc-1",
            whatsapp_message_id=str(uuid.uuid4()),
            meta_message_id="wamid.abc",
            execution_time_ms=25,
        )
        self.assertEqual(payload["operational_stage"], STAGE_DELIVERY)
        self.assertEqual(payload["meta_message_id"], "wamid.abc")
