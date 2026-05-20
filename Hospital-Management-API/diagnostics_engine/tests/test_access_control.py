"""Tests for report branch access control (fast unit + one queryset check)."""

from __future__ import annotations

import uuid
from unittest.mock import Mock

from django.test import SimpleTestCase, TestCase

from diagnostics_engine.services.reports.access_control import (
    filter_reports_queryset_for_branch,
    get_report_branch_id,
    report_belongs_to_branch,
)


class AccessControlUnitTests(SimpleTestCase):
    """No database — ownership chain logic only."""

    def test_get_report_branch_id_from_order_chain(self):
        branch_id = uuid.uuid4()
        report = Mock()
        report.order_test_line.order.branch_id = branch_id
        self.assertEqual(get_report_branch_id(report), branch_id)

    def test_report_belongs_to_branch_match(self):
        branch_id = uuid.uuid4()
        report = Mock()
        report.order_test_line.order.branch_id = branch_id
        self.assertTrue(report_belongs_to_branch(report=report, branch_id=branch_id))
        self.assertFalse(report_belongs_to_branch(report=report, branch_id=uuid.uuid4()))

    def test_report_belongs_to_branch_none_branch(self):
        report = Mock()
        report.order_test_line.order.branch_id = None
        self.assertFalse(report_belongs_to_branch(report=report, branch_id=uuid.uuid4()))


class AccessControlQuerysetTests(TestCase):
    """Single DB fixture via setUpTestData to avoid per-test factory cost."""

    @classmethod
    def setUpTestData(cls):
        from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
        from diagnostics_engine.models.reports import DiagnosticTestReport
        from diagnostics_engine.tests.test_order_creation_service import _lab_org_and_branch
        from diagnostics_engine.tests.test_report_query_service import _order_and_line

        cls.order, cls.line = _order_and_line(service_name="AccessCtrl")
        _org, cls.branch = _lab_org_and_branch()
        cls.order.branch = cls.branch
        cls.order.save(update_fields=["branch"])
        cls.report = DiagnosticTestReport.objects.create(
            order_test_line=cls.line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.READY,
        )

    def test_filter_queryset_for_branch_sql_filter(self):
        from diagnostics_engine.services.reports.report_query_service import ReportQueryService

        qs = ReportQueryService.get_reports_for_patient(patient_profile=self.order.patient_profile)
        filtered = filter_reports_queryset_for_branch(qs, self.branch.id)
        self.assertIn(self.report.id, list(filtered.values_list("id", flat=True)))

    def test_patient_reports_for_branch_helper(self):
        from diagnostics_engine.services.reports.report_query_service import ReportQueryService

        qs = ReportQueryService.get_patient_reports_for_branch(
            patient_profile=self.order.patient_profile,
            branch_id=self.branch.id,
        )
        self.assertEqual(list(qs.values_list("id", flat=True)), [self.report.id])
