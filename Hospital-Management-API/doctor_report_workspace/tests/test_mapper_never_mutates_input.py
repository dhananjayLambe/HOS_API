"""Guard: WorkspaceResponseMapper must never mutate input objects."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from types import SimpleNamespace

from django.test import SimpleTestCase

from doctor_report_workspace.domain.artifact_presentation import (
    ArtifactPresentation,
    ArtifactPreviewMetadata,
)
from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.mappers.workspace_response_mapper import WorkspaceResponseMapper
from doctor_report_workspace.services.artifacts.artifact_service import ArtifactService


def _snapshot(obj):
    """Shallow attribute snapshot for SimpleNamespace trees."""
    if isinstance(obj, SimpleNamespace):
        return {k: _snapshot(v) for k, v in vars(obj).items()}
    if isinstance(obj, (list, tuple)):
        return [_snapshot(v) for v in obj]
    return obj


class MapperNeverMutatesInputTests(SimpleTestCase):
    def test_to_patient_context_does_not_mutate(self):
        patient = SimpleNamespace(
            id="p1",
            public_id="PAT1",
            first_name="Ada",
            last_name="Lovelace",
            gender="F",
            age=36,
            account=SimpleNamespace(user=SimpleNamespace(username="999")),
        )
        before = deepcopy(_snapshot(patient))
        WorkspaceResponseMapper.to_patient_context(patient, last_visit_at=datetime(2026, 1, 1))
        self.assertEqual(_snapshot(patient), before)

    def test_to_artifact_from_presentation_does_not_mutate(self):
        presentation = ArtifactPresentation(
            artifact_id="a1",
            artifact_type="PDF",
            label="Primary Report",
            is_primary=True,
            preview_metadata=ArtifactPreviewMetadata(
                mime_type="application/pdf",
                extension="pdf",
                display_title="x.pdf",
                preview_supported=True,
                content_category="DOCUMENT",
            ),
        )
        before = deepcopy(presentation)
        WorkspaceResponseMapper.to_artifact_from_presentation(presentation)
        self.assertEqual(presentation, before)

    def test_to_report_detail_does_not_mutate_report_or_artifacts(self):
        patient = SimpleNamespace(
            id="p1",
            public_id="PAT1",
            first_name="Ada",
            last_name="Lovelace",
            gender="F",
            age=36,
            account=None,
        )
        order = SimpleNamespace(
            patient_profile=patient,
            branch=SimpleNamespace(name="Lab"),
            doctor=SimpleNamespace(name="Dr. X"),
            consultation_id=None,
            consultation=None,
            encounter=None,
            created_at=datetime(2026, 7, 1, 9, 0, 0),
            collected_at=None,
        )
        report = SimpleNamespace(
            id="r1",
            report_number="N1",
            order_test_line=SimpleNamespace(
                order=order,
                service=SimpleNamespace(name="CBC", category="Lab"),
            ),
            uploaded_at=datetime(2026, 7, 1, 12, 0, 0),
            ready_at=None,
            structured_result="ok",
            revision_number=1,
            supersedes_id=None,
            status="ready",
        )
        artifact = SimpleNamespace(
            id="a1",
            artifact_type="PDF",
            download_filename="x.pdf",
            original_filename="x.pdf",
            is_primary=True,
            uploaded_at=datetime(2026, 7, 1, 12, 0, 0),
            content_type="application/pdf",
            file_extension="pdf",
        )
        before_report = deepcopy(_snapshot(report))
        before_artifact = deepcopy(_snapshot(artifact))
        presentations = ArtifactService.present([artifact])
        WorkspaceResponseMapper.to_report_detail(
            report,
            clinical_status=ClinicalStatus.AVAILABLE,
            artifact_presentations=presentations,
        )
        self.assertEqual(_snapshot(report), before_report)
        self.assertEqual(_snapshot(artifact), before_artifact)
