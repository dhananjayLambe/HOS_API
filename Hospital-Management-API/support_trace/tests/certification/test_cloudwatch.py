"""CloudWatch certification tests."""

from __future__ import annotations

from django.test import SimpleTestCase

from support_trace.certification.cloudwatch_validator import CloudWatchValidator


class CloudWatchCertificationTests(SimpleTestCase):
    def test_validate_link_builder(self) -> None:
        warnings, score = CloudWatchValidator.validate()
        self.assertEqual(score, 1.0)
        self.assertEqual(warnings, [])
