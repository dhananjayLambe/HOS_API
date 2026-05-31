from __future__ import annotations

from django.core.exceptions import ValidationError
from django.test import TestCase

from diagnostics_engine.models.reports import ArtifactLifecycleState
from diagnostics_engine.services.reports import ArtifactUploadService
from diagnostics_engine.services.reports.artifact_lifecycle_service import ArtifactLifecycleService
from diagnostics_engine.tests.test_artifact_upload_service import _minimal_order_with_line, _pdf


class ArtifactLifecycleServiceTests(TestCase):
    def test_transition_allows_active_to_archived_and_back(self):
        _, line = _minimal_order_with_line()
        report = ArtifactUploadService.create_or_get_report_for_line(order_test_line=line)
        artifact = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"lifecycle")],
            primary_file_index=0,
        )[0]
        ArtifactLifecycleService.transition(artifact=artifact, to_state=ArtifactLifecycleState.ARCHIVED)
        artifact.refresh_from_db()
        self.assertEqual(artifact.artifact_state, ArtifactLifecycleState.ARCHIVED)
        self.assertFalse(artifact.is_active)
        self.assertTrue(artifact.is_archived)

        ArtifactLifecycleService.transition(artifact=artifact, to_state=ArtifactLifecycleState.ACTIVE)
        artifact.refresh_from_db()
        self.assertEqual(artifact.artifact_state, ArtifactLifecycleState.ACTIVE)
        self.assertTrue(artifact.is_active)
        self.assertFalse(artifact.is_archived)

    def test_transition_rejects_invalid_state_change(self):
        _, line = _minimal_order_with_line()
        report = ArtifactUploadService.create_or_get_report_for_line(order_test_line=line)
        artifact = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"invalid")],
            primary_file_index=0,
        )[0]
        ArtifactLifecycleService.transition(artifact=artifact, to_state=ArtifactLifecycleState.DELETED)
        artifact.refresh_from_db()
        with self.assertRaises(ValidationError):
            ArtifactLifecycleService.transition(artifact=artifact, to_state=ArtifactLifecycleState.ACTIVE)

    def test_upload_keeps_single_active_artifact_per_type(self):
        _, line = _minimal_order_with_line()
        report = ArtifactUploadService.create_or_get_report_for_line(order_test_line=line)
        first = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"v1")],
            primary_file_index=0,
        )[0]
        second = ArtifactUploadService.upload_report_artifacts(
            report=report,
            uploaded_files=[_pdf(b"v2")],
            primary_file_index=0,
        )[0]
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.is_active)
        self.assertEqual(first.artifact_state, ArtifactLifecycleState.ARCHIVED)
        self.assertTrue(second.is_active)
        self.assertEqual(second.artifact_state, ArtifactLifecycleState.ACTIVE)
