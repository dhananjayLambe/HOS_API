"""End-to-end certification workflow tests."""

from __future__ import annotations

from django.test import TestCase

from clinical_audit.certification.certification_service import ClinicalAuditCertificationService
from clinical_audit.certification.constants import (
    CERTIFICATION_EXPECTED_COUNT,
    CERTIFICATION_REQUIRED_ACTIONS,
)
from clinical_audit.tests.support.certification_workflow import (
    CertificationWorkflowContext,
    certification_action_audits,
)


class PatientWorkflowCertificationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        CertificationWorkflowContext.prepare_master_data()

    def setUp(self) -> None:
        self.context = CertificationWorkflowContext()

    def tearDown(self) -> None:
        self.context.clear_context()

    def test_full_patient_journey_emits_thirteen_certification_events(self) -> None:
        result = self.context.run(self)
        cert_audits = certification_action_audits(result.correlation_id)
        self.assertEqual(len(cert_audits), CERTIFICATION_EXPECTED_COUNT)

        action_counts = {audit.action: 0 for audit in cert_audits}
        for audit in cert_audits:
            action_counts[audit.action] += 1
        for action in CERTIFICATION_REQUIRED_ACTIONS:
            self.assertEqual(
                action_counts.get(action, 0),
                1,
                f"Expected exactly one {action} audit row.",
            )

    def test_certification_service_passes_for_canonical_workflow(self) -> None:
        result = self.context.run(self)
        report = ClinicalAuditCertificationService().certify(
            correlation_id=result.correlation_id,
            consultation_id=result.consultation_id,
            patient_account_id=result.patient_account_id,
        )
        self.assertTrue(report.passed, report.errors)
        self.assertEqual(report.event_count, CERTIFICATION_EXPECTED_COUNT)
        self.assertEqual(report.correlation_id, result.correlation_id)

    def test_all_certification_rows_share_correlation_id(self) -> None:
        result = self.context.run(self)
        correlation_ids = {
            audit.correlation_id for audit in certification_action_audits(result.correlation_id)
        }
        self.assertEqual(correlation_ids, {result.correlation_id})
