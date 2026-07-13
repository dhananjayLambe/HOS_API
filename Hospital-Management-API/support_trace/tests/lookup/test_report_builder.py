"""Investigation report builder tests."""

from django.test import SimpleTestCase
from unittest.mock import MagicMock

from support_trace.lookup.enums import InvestigationLevel
from support_trace.lookup.report_builder import InvestigationReportBuilder
from support_trace.lookup.types import (
    InvestigationSummary,
    NarrativeSummary,
    StructuredSummary,
    TraceLookupResult,
)


class ReportBuilderTests(SimpleTestCase):
    def test_markdown_contains_summary(self) -> None:
        result = TraceLookupResult(
            scope="workflow:abc",
            level=InvestigationLevel.FULL,
            duration_ms=12.5,
            summary=InvestigationSummary(
                structured=StructuredSummary(
                    workflow_type="Booking",
                    current_status="Completed",
                    current_step=None,
                    next_expected_step=None,
                    started_at=None,
                    completed_at=None,
                    duration_display="5 min",
                    retry_count=0,
                    failure_count=0,
                    patient_label=None,
                    owner_label=None,
                ),
                narrative=NarrativeSummary(text="Booking completed successfully."),
            ),
        )
        md = InvestigationReportBuilder.to_markdown(result)
        self.assertIn("Booking completed successfully", md)
        self.assertIn("Investigation Report", md)

    def test_json_export(self) -> None:
        result = TraceLookupResult(scope="workflow:abc", duration_ms=1.0)
        payload = InvestigationReportBuilder.to_json(result)
        self.assertEqual(payload["scope"], "workflow:abc")
