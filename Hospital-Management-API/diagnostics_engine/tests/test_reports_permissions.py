"""Tests for report operational permission mapping."""

from __future__ import annotations

from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from diagnostics_engine.domain.reports.report_actions import ReportAction
from diagnostics_engine.models.choices import ReportLifecycleStatus, ReportStorageMode
from diagnostics_engine.models.reports import DiagnosticTestReport
from diagnostics_engine.permissions.reports import (
    REPORT_ACTION_PERMISSION_MAP,
    permission_class_for_action,
)
from labs.tests.support.workflow_factories import lab_admin_client, lab_mode_assignment


class ReportPermissionMapTests(SimpleTestCase):
    """Fast — no database."""

    def test_action_permission_map_covers_all_actions(self):
        for action in ReportAction:
            self.assertIn(action, REPORT_ACTION_PERMISSION_MAP)
            self.assertIsNotNone(permission_class_for_action(action))


class ReportPermissionsAPITests(TestCase):
    """API checks — instance setUp so APIClient auth is reliable."""

    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()
        self.assignment, self.order = lab_mode_assignment(self.branch)
        self.line = self.order.test_lines.first()
        self.report = DiagnosticTestReport.objects.create(
            order_test_line=self.line,
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )

    def test_unauthorized_mark_ready(self):
        anon = APIClient()
        url = reverse("v1-report-mark-ready", kwargs={"report_id": self.report.id})
        res = anon.post(url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cross_branch_detail_denied(self):
        other_client, _olu, other_branch, _ = lab_admin_client(branch_name="Perm Other Branch")
        _a2, order2 = lab_mode_assignment(other_branch)
        report2 = DiagnosticTestReport.objects.create(
            order_test_line=order2.test_lines.first(),
            storage_mode=ReportStorageMode.FILE,
            status=ReportLifecycleStatus.PENDING,
        )
        url = reverse("v1-report-detail", kwargs={"report_id": report2.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data["error"]["code"], "BRANCH_ACCESS_DENIED")
