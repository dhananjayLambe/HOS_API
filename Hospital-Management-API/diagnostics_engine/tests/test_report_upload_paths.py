"""Tests for report artifact storage path layout."""

from __future__ import annotations

import uuid
from types import SimpleNamespace

from django.test import SimpleTestCase

from diagnostics_engine.storage.report_upload_paths import build_report_artifact_upload_path


class ReportArtifactUploadPathTests(SimpleTestCase):
    def test_hive_path_uses_patient_encounter_report_and_type(self):
        encounter_id = uuid.uuid4()
        patient_profile_id = uuid.uuid4()
        patient_account_id = uuid.uuid4()
        report_id = uuid.uuid4()
        artifact = SimpleNamespace(
            id=uuid.uuid4(),
            report_id=report_id,
            version=1,
            artifact_type="PDF",
            report=SimpleNamespace(
                order_test_line=SimpleNamespace(
                    order=SimpleNamespace(
                        encounter=SimpleNamespace(id=encounter_id),
                        patient_profile=SimpleNamespace(
                            id=patient_profile_id,
                            account_id=patient_account_id,
                        ),
                    ),
                ),
            ),
        )

        path = build_report_artifact_upload_path(artifact, "signed-report.pdf")

        self.assertTrue(path.startswith("diagnostic-reports/active/"))
        self.assertIn(f"patient-account={patient_account_id}", path)
        self.assertIn(f"patient={patient_profile_id}", path)
        self.assertIn("year=", path)
        self.assertIn("month=", path)
        self.assertNotIn("day=", path)
        self.assertIn(f"encounter={encounter_id}", path)
        self.assertIn(f"report={report_id}", path)
        self.assertIn("artifact-type=pdf", path)
        self.assertIn(f"artifact_{artifact.id}_v1.pdf", path)
        self.assertEqual(artifact.stored_filename, f"artifact_{artifact.id}_v1.pdf")

    def test_unknown_encounter_when_missing(self):
        report_id = uuid.uuid4()
        artifact = SimpleNamespace(
            id=uuid.uuid4(),
            report_id=report_id,
            version=2,
            artifact_type="PDF",
            report=SimpleNamespace(
                order_test_line=SimpleNamespace(
                    order=SimpleNamespace(encounter=None, patient_profile=None),
                ),
            ),
        )

        path = build_report_artifact_upload_path(artifact, "report.pdf")

        self.assertIn("encounter=unknown-encounter", path)
        self.assertIn("patient-account=unknown-account", path)
        self.assertIn("patient=unknown-patient", path)
