"""Clinical status domain tests."""

from django.test import SimpleTestCase

from doctor_report_workspace.domain.statuses import ClinicalStatus


class ClinicalStatusTests(SimpleTestCase):
    def test_phase1_statuses_are_exactly_three(self):
        self.assertEqual(
            ClinicalStatus.ALL,
            frozenset(
                {
                    ClinicalStatus.AWAITING_REPORT,
                    ClinicalStatus.AVAILABLE,
                    ClinicalStatus.UPDATED,
                }
            ),
        )
