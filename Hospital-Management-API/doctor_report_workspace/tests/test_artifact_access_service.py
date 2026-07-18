"""Unit tests for ArtifactAccessService (storage mocked)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from doctor_report_workspace.services.artifacts.artifact_access_service import (
    ArtifactAccessError,
    ArtifactAccessService,
)


class ArtifactAccessServiceTests(SimpleTestCase):
    @override_settings(REPORT_PRESIGNED_URL_EXPIRY_SECONDS=120)
    @patch(
        "doctor_report_workspace.services.artifacts.artifact_access_service.ReportStorageService.download_url",
        return_value="https://cdn.example/opaque?sig=abc",
    )
    def test_download_returns_opaque_url(self, mock_download):
        artifact = SimpleNamespace(id="art-1", storage_key="secret/key.pdf")
        url = ArtifactAccessService.generate_download_url(artifact)
        self.assertEqual(url, "https://cdn.example/opaque?sig=abc")
        mock_download.assert_called_once_with(
            artifact, expires_in=120, disposition="attachment"
        )
        self.assertNotIn("secret/key", url)
        self.assertNotIn("bucket", url.lower())

    @patch(
        "doctor_report_workspace.services.artifacts.artifact_access_service.ReportStorageService.download_url",
        return_value=None,
    )
    def test_download_raises_when_unavailable(self, _mock):
        with self.assertRaises(ArtifactAccessError):
            ArtifactAccessService.generate_download_url(SimpleNamespace(id="x"))

    @override_settings(REPORT_PRESIGNED_URL_EXPIRY_SECONDS=120)
    @patch(
        "doctor_report_workspace.services.artifacts.artifact_access_service.ReportStorageService.preview_url",
        return_value="https://cdn.example/inline?sig=xyz",
    )
    def test_preview_returns_opaque_url(self, mock_preview):
        artifact = SimpleNamespace(id="art-1", storage_key="secret/key.pdf")
        url = ArtifactAccessService.generate_preview_url(artifact)
        self.assertEqual(url, "https://cdn.example/inline?sig=xyz")
        mock_preview.assert_called_once_with(artifact, expires_in=120)
        self.assertNotIn("secret/key", url)
        self.assertNotIn("bucket", url.lower())

    @patch(
        "doctor_report_workspace.services.artifacts.artifact_access_service.ReportStorageService.preview_url",
        return_value=None,
    )
    def test_preview_raises_when_unavailable(self, _mock):
        with self.assertRaises(ArtifactAccessError):
            ArtifactAccessService.generate_preview_url(SimpleNamespace(id="x"))

    @override_settings(REPORT_PRESIGNED_URL_EXPIRY_SECONDS=300)
    def test_default_expires_in(self):
        self.assertEqual(ArtifactAccessService.default_expires_in(), 300)
