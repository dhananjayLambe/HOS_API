"""Unit tests for PrimaryArtifactSelector."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from django.test import SimpleTestCase

from doctor_report_workspace.services.artifacts.primary_selector import PrimaryArtifactSelector


class PrimaryArtifactSelectorTests(SimpleTestCase):
    def test_empty(self):
        self.assertIsNone(PrimaryArtifactSelector.select([]))

    def test_explicit_primary(self):
        a = SimpleNamespace(id="1", is_primary=False, uploaded_at=datetime(2026, 7, 2))
        b = SimpleNamespace(id="2", is_primary=True, uploaded_at=datetime(2026, 7, 1))
        self.assertEqual(PrimaryArtifactSelector.select([a, b]).id, "2")

    def test_fallback_newest_uploaded(self):
        older = SimpleNamespace(id="1", is_primary=False, uploaded_at=datetime(2026, 7, 1))
        newer = SimpleNamespace(id="2", is_primary=False, uploaded_at=datetime(2026, 7, 3))
        self.assertEqual(PrimaryArtifactSelector.select([older, newer]).id, "2")

    def test_fallback_first_when_no_timestamps(self):
        a = SimpleNamespace(id="a", is_primary=False, uploaded_at=None)
        b = SimpleNamespace(id="b", is_primary=False, uploaded_at=None)
        self.assertEqual(PrimaryArtifactSelector.select([a, b]).id, "a")

    def test_single(self):
        only = SimpleNamespace(id="only", is_primary=False, uploaded_at=None)
        self.assertEqual(PrimaryArtifactSelector.select([only]).id, "only")
