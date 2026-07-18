"""Permission-layer tests (CI-ready placeholder)."""

from django.test import SimpleTestCase


class PermissionScaffoldTests(SimpleTestCase):
    def test_permissions_importable(self):
        from doctor_report_workspace.permissions.reports import ReportPermission
        from doctor_report_workspace.permissions.workspace import WorkspacePermission

        self.assertTrue(callable(WorkspacePermission))
        self.assertTrue(callable(ReportPermission))
