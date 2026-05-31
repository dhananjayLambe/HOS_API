"""Tests for storage key/path fallback compatibility."""

from __future__ import annotations

from types import SimpleNamespace

from django.test import SimpleTestCase

from diagnostics_engine.storage.report_storage import ReportStorageService


class ReportStorageServiceTests(SimpleTestCase):
    def test_storage_path_prefers_storage_key(self):
        artifact = SimpleNamespace(
            storage_key="diagnostic-reports/active/new-path.pdf",
            storage_path="diagnostic-reports/legacy/old-path.pdf",
            file=SimpleNamespace(name="diagnostic-reports/file-name.pdf"),
        )
        self.assertEqual(
            ReportStorageService.storage_path(artifact),
            "diagnostic-reports/active/new-path.pdf",
        )

    def test_storage_path_does_not_fallback_to_legacy_storage_path(self):
        artifact = SimpleNamespace(
            storage_key="",
            storage_path="diagnostic-reports/year=2026/month=05/day=28/legacy.pdf",
            file=SimpleNamespace(name="diagnostic-reports/file-name.pdf"),
        )
        self.assertEqual(ReportStorageService.storage_path(artifact), "")

    def test_storage_path_does_not_fallback_to_file_name(self):
        artifact = SimpleNamespace(
            storage_key=None,
            storage_path=None,
            file=SimpleNamespace(name="diagnostic-reports/file-only.pdf"),
        )
        self.assertIsNone(ReportStorageService.storage_path(artifact))
