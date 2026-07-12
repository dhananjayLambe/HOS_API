"""Aggregated certification service tests."""

from __future__ import annotations

import json
from pathlib import Path

from django.test import TestCase

from clinical_audit.certification.certification_service import ClinicalAuditCertificationService
from clinical_audit.certification.constants import CERTIFICATION_EXPECTED_COUNT
from clinical_audit.certification.immutability_validator import ImmutabilityValidator
from clinical_audit.tests.support.certification_workflow import (
    CertificationWorkflowContext,
)


class CertificationServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        CertificationWorkflowContext.prepare_master_data()

    def setUp(self) -> None:
        self.context = CertificationWorkflowContext()
        self.fixture_path = (
            Path(__file__).resolve().parents[1] / "fixtures" / "certification_expected_timeline.json"
        )

    def tearDown(self) -> None:
        self.context.clear_context()

    def test_certification_report_structure(self) -> None:
        result = self.context.run(self)
        report = ClinicalAuditCertificationService().certify(
            correlation_id=result.correlation_id,
            consultation_id=result.consultation_id,
            patient_account_id=result.patient_account_id,
        )
        payload = report.to_dict()
        self.assertIn("validators", payload)
        self.assertEqual(len(payload["validators"]), 4)
        validator_names = {item["name"] for item in payload["validators"]}
        self.assertEqual(
            validator_names,
            {"timeline", "correlation", "payload", "immutability"},
        )

    def test_immutability_validator_blocks_mutations(self) -> None:
        result = self.context.run(self)
        immutability = ImmutabilityValidator().validate(result.audits)
        self.assertTrue(immutability.passed, immutability.errors)

    def test_certification_loads_expected_timeline_fixture(self) -> None:
        fixture = json.loads(self.fixture_path.read_text(encoding="utf-8"))
        self.assertEqual(fixture["expected_count"], CERTIFICATION_EXPECTED_COUNT)
        self.assertEqual(len(fixture["required_actions"]), CERTIFICATION_EXPECTED_COUNT)
