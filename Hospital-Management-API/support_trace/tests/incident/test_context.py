"""IncidentContext and ReconstructionPolicy tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.incident import ReconstructionLevel
from support_trace.incident.investigation_context import IncidentContext, ReconstructionPolicy
from support_trace.lookup.enums import InvestigationLevel


class IncidentContextTests(SimpleTestCase):
    def test_create_generates_investigation_id(self) -> None:
        ctx = IncidentContext.create("booking:abc")
        self.assertTrue(len(ctx.investigation_id) > 0)

    def test_custom_investigation_id(self) -> None:
        ctx = IncidentContext.create("booking:abc", investigation_id="custom-id")
        self.assertEqual(ctx.investigation_id, "custom-id")

    def test_basic_level_options(self) -> None:
        ctx = IncidentContext.create("test", level=ReconstructionLevel.BASIC)
        opts = ctx.options
        self.assertFalse(opts.include_failure)
        self.assertFalse(opts.include_summary)

    def test_full_level_options(self) -> None:
        ctx = IncidentContext.create("test", level=ReconstructionLevel.FULL)
        opts = ctx.options
        self.assertTrue(opts.include_failure)
        self.assertTrue(opts.include_graph)

    def test_deep_level_includes_narrative(self) -> None:
        ctx = IncidentContext.create("test", level=ReconstructionLevel.DEEP)
        opts = ctx.options
        self.assertTrue(opts.include_narrative)
        self.assertTrue(opts.include_recommendations)

    def test_level_maps_to_investigation_level(self) -> None:
        self.assertEqual(
            ReconstructionPolicy.to_investigation_level(ReconstructionLevel.FULL),
            InvestigationLevel.FULL,
        )

    def test_policy_for_support_masks_pii(self) -> None:
        policy = ReconstructionPolicy.for_support()
        self.assertTrue(policy.mask_patient_pii)

    def test_policy_to_investigation_policy(self) -> None:
        policy = ReconstructionPolicy.for_admin()
        inv = policy.to_investigation_policy()
        self.assertEqual(inv.role, "admin")
