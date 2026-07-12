"""Performance validation tests for Clinical Audit certification."""

from __future__ import annotations

from django.test import TestCase

from clinical_audit.certification.constants import (
    PERF_TARGET_AUDIT_WRITE_MS,
    PERF_TARGET_CERTIFICATION_MS,
    PERF_TARGET_TIMELINE_RECONSTRUCTION_MS,
)
from clinical_audit.certification.performance_validator import PerformanceValidator
from clinical_audit.tests.support.certification_workflow import (
    CertificationWorkflowContext,
    certification_action_audits,
)


class PerformanceCertificationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        CertificationWorkflowContext.prepare_master_data()

    def setUp(self) -> None:
        self.context = CertificationWorkflowContext()

    def tearDown(self) -> None:
        self.context.clear_context()

    def test_performance_targets_within_bounds(self) -> None:
        result = self.context.run(self)
        cert_audits = certification_action_audits(result.correlation_id)

        def _run_core() -> None:
            PerformanceValidator().validate(
                cert_audits,
                correlation_id=result.correlation_id,
            )

        perf = PerformanceValidator().validate(
            cert_audits,
            correlation_id=result.correlation_id,
            certification_runner=_run_core,
        )
        self.assertTrue(perf.passed, perf.errors)
        metrics = perf.metrics
        self.assertLessEqual(
            metrics.get("timeline_reconstruction_ms", 0),
            PERF_TARGET_TIMELINE_RECONSTRUCTION_MS * 5,
        )
        self.assertLessEqual(
            metrics.get("certification_runtime_ms", 0),
            PERF_TARGET_CERTIFICATION_MS * 5,
        )
        self.assertLessEqual(
            metrics.get("audit_write_ms", 0),
            PERF_TARGET_AUDIT_WRITE_MS * 10,
        )
