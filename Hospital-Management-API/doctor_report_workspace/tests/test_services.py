"""Service-layer tests (CI-ready placeholder)."""

from django.test import SimpleTestCase


class WorkspaceServiceScaffoldTests(SimpleTestCase):
    def test_workspace_service_importable(self):
        from doctor_report_workspace.services.workspace.workspace_service import (
            WorkspaceService,
        )

        self.assertTrue(callable(WorkspaceService))
