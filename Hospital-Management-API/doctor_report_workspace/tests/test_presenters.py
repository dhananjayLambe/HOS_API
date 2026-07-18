"""Presenter-layer tests."""

from django.test import SimpleTestCase


class PresenterScaffoldTests(SimpleTestCase):
    def test_presenters_importable(self):
        from doctor_report_workspace.services.workspace.preview_presenter import (
            PreviewPresenter,
        )
        from doctor_report_workspace.services.workspace.workspace_presenter import (
            WorkspacePresenter,
        )

        self.assertTrue(callable(WorkspacePresenter))
        self.assertTrue(callable(PreviewPresenter))
