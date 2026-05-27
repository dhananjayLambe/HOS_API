"""Tests for report artifact storage path layout."""

from __future__ import annotations

import uuid
from types import SimpleNamespace

from django.test import SimpleTestCase

from diagnostics_engine.storage.report_upload_paths import build_report_artifact_upload_path


class ReportArtifactUploadPathTests(SimpleTestCase):
    def test_hive_path_uses_encounter_and_report_ids(self):
        encounter_id = uuid.uuid4()
        report_id = uuid.uuid4()
        artifact = SimpleNamespace(
            id=uuid.uuid4(),
            report_id=report_id,
            version=1,
            report=SimpleNamespace(
                order_test_line=SimpleNamespace(
                    order=SimpleNamespace(
                        encounter=SimpleNamespace(id=encounter_id),
                    ),
                ),
            ),
        )

        path = build_report_artifact_upload_path(artifact, "signed-report.pdf")

        self.assertTrue(path.startswith("diagnostic-reports/year="))
        self.assertIn(f"encounter={encounter_id}", path)
        self.assertIn(f"report={report_id}", path)
        self.assertIn(f"artifact_{artifact.id}_v1.pdf", path)
        self.assertEqual(artifact.stored_filename, f"artifact_{artifact.id}_v1.pdf")

    def test_unknown_encounter_when_missing(self):
        report_id = uuid.uuid4()
        artifact = SimpleNamespace(
            id=uuid.uuid4(),
            report_id=report_id,
            version=2,
            report=SimpleNamespace(
                order_test_line=SimpleNamespace(
                    order=SimpleNamespace(encounter=None),
                ),
            ),
        )

        path = build_report_artifact_upload_path(artifact, "report.pdf")

        self.assertIn("encounter=unknown-encounter", path)
