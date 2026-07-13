"""Investigation policy tests."""

from django.test import SimpleTestCase

from support_trace.lookup.enums import InvestigationLevel
from support_trace.lookup.investigation_policy import InvestigationPolicy


class InvestigationPolicyTests(SimpleTestCase):
    def test_patient_policy_masks_and_limits(self) -> None:
        policy = InvestigationPolicy.for_patient_investigation()
        self.assertTrue(policy.mask_patient_pii)
        self.assertEqual(policy.max_graph_depth, 4)
        self.assertIsNotNone(policy.allowed_workflow_types)

    def test_admin_policy_expands(self) -> None:
        policy = InvestigationPolicy.for_admin()
        self.assertFalse(policy.mask_patient_pii)
        self.assertEqual(policy.max_graph_depth, 10)

    def test_basic_level_options(self) -> None:
        opts = InvestigationPolicy.default().apply_level(InvestigationLevel.BASIC)
        self.assertFalse(opts.include_timeline)
        self.assertTrue(opts.include_summary)

    def test_deep_level_includes_report(self) -> None:
        opts = InvestigationPolicy.default().apply_level(InvestigationLevel.DEEP)
        self.assertTrue(opts.include_report)
