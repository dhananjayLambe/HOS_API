"""Unit tests for ArtifactAccessResolver."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

from django.test import SimpleTestCase

from doctor_report_workspace.services.artifacts.artifact_access_resolver import (
    ArtifactAccessResolver,
    ArtifactAccessValidationError,
)
from doctor_report_workspace.services.workspace.workspace_report_detail_service import (
    WorkspaceReportNotFound,
)


def _art(**kwargs):
    defaults = dict(
        id=str(uuid4()),
        artifact_type="PDF",
        is_primary=False,
        uploaded_at=datetime(2026, 7, 1),
        content_type="application/pdf",
        file_extension="pdf",
        download_filename="report.pdf",
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class ArtifactAccessResolverTests(SimpleTestCase):
    def test_default_download_primary(self):
        pid = str(uuid4())
        sid = str(uuid4())
        primary = _art(is_primary=True, id=pid)
        secondary = _art(id=sid, artifact_type="CSV", content_type="text/csv")
        resolved = ArtifactAccessResolver.resolve(
            report=SimpleNamespace(id="r1"),
            artifacts=[secondary, primary],
            artifact_id=None,
            report_uuid="r1",
            require_previewable=False,
        )
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.artifact_id, pid)

    def test_explicit_artifact(self):
        pid = str(uuid4())
        sid = str(uuid4())
        primary = _art(is_primary=True, id=pid)
        secondary = _art(
            id=sid,
            artifact_type="IMAGE",
            content_type="image/png",
            file_extension="png",
        )
        resolved = ArtifactAccessResolver.resolve(
            report=SimpleNamespace(id="r1"),
            artifacts=[primary, secondary],
            artifact_id=sid,
            report_uuid="r1",
            require_previewable=True,
        )
        self.assertEqual(resolved.artifact_id, sid)

    def test_foreign_artifact_404(self):
        primary = _art(is_primary=True)
        with self.assertRaises(WorkspaceReportNotFound):
            ArtifactAccessResolver.resolve(
                report=SimpleNamespace(id="r1"),
                artifacts=[primary],
                artifact_id=str(uuid4()),
                report_uuid="r1",
                require_previewable=False,
            )

    def test_invalid_artifact_id(self):
        primary = _art(is_primary=True)
        with self.assertRaises(ArtifactAccessValidationError):
            ArtifactAccessResolver.resolve(
                report=SimpleNamespace(id="r1"),
                artifacts=[primary],
                artifact_id="bad",
                report_uuid="r1",
            )

    def test_zip_explicit_preview_404(self):
        zid = str(uuid4())
        zip_art = _art(
            id=zid,
            is_primary=True,
            artifact_type="ZIP",
            content_type="application/zip",
            file_extension="zip",
            download_filename="bundle.zip",
        )
        with self.assertRaises(WorkspaceReportNotFound):
            ArtifactAccessResolver.resolve(
                report=SimpleNamespace(id="r1"),
                artifacts=[zip_art],
                artifact_id=zid,
                report_uuid="r1",
                require_previewable=True,
            )
