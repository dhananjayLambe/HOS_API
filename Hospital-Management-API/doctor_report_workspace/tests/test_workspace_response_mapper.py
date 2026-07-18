"""WorkspaceResponseMapper tests — Phase 1 DTO shapes, no ORM leakage."""

from __future__ import annotations

import json
from datetime import date, datetime
from types import SimpleNamespace

from django.test import SimpleTestCase

from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.mappers.workspace_response_mapper import WorkspaceResponseMapper
from doctor_report_workspace.services.workspace.clinical_status_mapper import ClinicalStatusMapper


def _patient(**overrides):
    base = dict(
        id="pat-1",
        public_id="PAT1001",
        first_name="Ada",
        last_name="Lovelace",
        gender="F",
        age=36,
        account=SimpleNamespace(user=SimpleNamespace(username="9876543210")),
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _report(*, patient=None, revision_number=1, supersedes_id=None, status="ready"):
    patient = patient or _patient()
    service = SimpleNamespace(name="CBC", category="Hematology")
    branch = SimpleNamespace(name="Main Lab")
    doctor = SimpleNamespace(name="Dr. Gray")
    order = SimpleNamespace(
        patient_profile=patient,
        branch=branch,
        doctor=doctor,
        consultation_id="cons-9",
        consultation=SimpleNamespace(id="cons-9"),
        encounter=SimpleNamespace(id="enc-3"),
        created_at=datetime(2026, 7, 1, 9, 0, 0),
        collected_at=datetime(2026, 7, 1, 10, 30, 0),
    )
    line = SimpleNamespace(order=order, service=service)
    return SimpleNamespace(
        id="rep-1",
        report_number="R-100",
        order_test_line=line,
        uploaded_at=datetime(2026, 7, 1, 12, 0, 0),
        ready_at=datetime(2026, 7, 1, 12, 5, 0),
        structured_result="Hb 13.2 g/dL within normal limits for adult female.",
        revision_number=revision_number,
        supersedes_id=supersedes_id,
        status=status,
    )


class WorkspaceResponseMapperTests(SimpleTestCase):
    def test_patient_identifier_maps_public_id(self):
        dto = WorkspaceResponseMapper.to_patient_context(_patient())
        self.assertEqual(dto.identifier, "PAT1001")
        self.assertEqual(dto.name, "Ada Lovelace")
        self.assertEqual(dto.mobile, "9876543210")
        self.assertNotIn("uhid", dto.to_dict())
        self.assertNotIn("MRN", dto.to_dict())

    def test_artifact_type_bucketing_via_presentation(self):
        from doctor_report_workspace.domain.artifact_presentation import (
            ArtifactPresentation,
            ArtifactPreviewMetadata,
        )

        def _pres(*, aid, artifact_type):
            return ArtifactPresentation(
                artifact_id=aid,
                artifact_type=artifact_type,
                label="Label",
                is_primary=False,
                preview_metadata=ArtifactPreviewMetadata(
                    mime_type=None,
                    extension=None,
                    display_title="t",
                    preview_supported=False,
                    content_category="OTHER",
                ),
            )

        pdf = WorkspaceResponseMapper.to_artifact_from_presentation(
            _pres(aid="a1", artifact_type="PDF")
        )
        image = WorkspaceResponseMapper.to_artifact_from_presentation(
            _pres(aid="a2", artifact_type="IMAGE"),
            download_url="/signed/a2",
        )
        other = WorkspaceResponseMapper.to_artifact_from_presentation(
            _pres(aid="a3", artifact_type="OTHER"),
            download_url="/signed/a3",
        )
        self.assertEqual(pdf.artifact_type, "PDF")
        self.assertIsNone(pdf.preview_url)
        self.assertEqual(pdf.download_url, "")
        self.assertEqual(image.artifact_type, "IMAGE")
        self.assertEqual(image.download_url, "/signed/a2")
        self.assertEqual(other.artifact_type, "OTHER")

    def test_timeline_iso_dates(self):
        dto = WorkspaceResponseMapper.to_timeline(
            ordered_at=datetime(2026, 7, 1, 9, 0, 0),
            collected_at=date(2026, 7, 1),
            uploaded_at=None,
        )
        self.assertEqual(dto.ordered_at, "2026-07-01T09:00:00")
        self.assertEqual(dto.collected_at, "2026-07-01")
        self.assertIsNone(dto.uploaded_at)

    def test_status_passthrough_does_not_invent_status(self):
        report = _report()
        dto = WorkspaceResponseMapper.to_report_from_report_object(
            report,
            clinical_status=ClinicalStatus.UPDATED,
        )
        self.assertEqual(dto.clinical_status, ClinicalStatus.UPDATED)
        # Mapper must not re-derive from revision/status fields
        awaiting = WorkspaceResponseMapper.to_report_from_report_object(
            report,
            clinical_status=ClinicalStatus.AWAITING_REPORT,
        )
        self.assertEqual(awaiting.clinical_status, ClinicalStatus.AWAITING_REPORT)

    def test_clinical_status_mapper_is_source_of_status(self):
        available = ClinicalStatusMapper.map_report(
            report=_report(revision_number=1),
            has_artifact=True,
        )
        updated = ClinicalStatusMapper.map_report(
            report=_report(revision_number=2),
            has_artifact=True,
        )
        self.assertEqual(available, ClinicalStatus.AVAILABLE)
        self.assertEqual(updated, ClinicalStatus.UPDATED)
        self.assertEqual(ClinicalStatusMapper.awaiting(), ClinicalStatus.AWAITING_REPORT)

    def test_report_detail_shape(self):
        from doctor_report_workspace.services.artifacts.artifact_service import (
            ArtifactService,
        )

        report = _report()
        artifact = SimpleNamespace(
            id="art-1",
            artifact_type="PDF",
            download_filename="cbc.pdf",
            is_primary=True,
            uploaded_at=datetime(2026, 7, 1, 12, 0, 0),
            content_type="application/pdf",
            file_extension="pdf",
            original_filename="cbc.pdf",
        )
        presentations = ArtifactService.present([artifact])
        detail = WorkspaceResponseMapper.to_report_detail(
            report,
            clinical_status=ClinicalStatus.AVAILABLE,
            artifact_presentations=presentations,
        )
        payload = detail.to_dict()
        self.assertEqual(payload["id"], "rep-1")
        self.assertEqual(len(payload["artifacts"]), 1)
        self.assertEqual(payload["artifacts"][0]["artifact_type"], "PDF")
        self.assertEqual(payload["artifacts"][0]["label"], "Primary Report")
        self.assertIsNone(payload["artifacts"][0]["preview_url"])
        self.assertEqual(payload["artifacts"][0]["download_url"], "")
        self.assertIn("ordered_at", payload["timeline"])
        self.assertIn("collected_at", payload["timeline"])
        self.assertIn("uploaded_at", payload["timeline"])
        self.assertTrue(payload["clinical_findings"])
        self.assertEqual(payload["patient"]["identifier"], "PAT1001")

    def test_list_summary_filters_response_dtos(self):
        report_dto = WorkspaceResponseMapper.to_report_from_report_object(
            _report(),
            clinical_status=ClinicalStatus.AVAILABLE,
        )
        list_dto = WorkspaceResponseMapper.to_list_response(
            [report_dto],
            page=1,
            page_size=20,
            next_cursor=None,
        )
        list_payload = list_dto.to_dict()
        self.assertIn("reports", list_payload)
        self.assertIn("pagination", list_payload)
        self.assertNotIn("summary", list_payload)
        self.assertNotIn("filters", list_payload)

        summary = WorkspaceResponseMapper.to_summary(
            reports_ready=3,
            awaiting=2,
            critical=0,
            as_response=True,
        ).to_dict()
        self.assertEqual(set(summary.keys()), {"summary"})
        self.assertEqual(summary["summary"]["reports_ready"], 3)

        filters = WorkspaceResponseMapper.to_filters(
            statuses=[ClinicalStatus.AVAILABLE],
            labs=["Main Lab"],
            categories=["Hematology"],
            doctors=["Dr. Gray"],
            branches=["Main Lab"],
            as_response=True,
        ).to_dict()
        self.assertEqual(set(filters.keys()), {"filters"})
        self.assertEqual(filters["filters"]["labs"], ["Main Lab"])

    def test_null_safe_missing_relations(self):
        bare = SimpleNamespace(
            id="rep-bare",
            report_number=None,
            order_test_line=None,
            uploaded_at=None,
            ready_at=None,
            structured_result=None,
            revision_number=1,
            supersedes_id=None,
            status="pending",
        )
        # patient required for to_report_from_report_object — use to_report with minimal patient
        patient = SimpleNamespace(
            id="p2",
            public_id="PAT2",
            first_name="No",
            last_name="Relations",
            gender="",
            age=None,
            account=None,
        )
        dto = WorkspaceResponseMapper.to_report(
            report_id=bare.id,
            clinical_status=ClinicalStatus.AWAITING_REPORT,
            patient=patient,
            test_name="Pending panel",
        )
        payload = dto.to_dict()
        self.assertIsNone(payload["lab_name"])
        self.assertIsNone(payload["patient"]["mobile"])
        self.assertIsNone(payload["uploaded_at"])
    def test_to_dict_is_json_safe_with_no_orm(self):
        from doctor_report_workspace.services.artifacts.artifact_service import (
            ArtifactService,
        )

        presentations = ArtifactService.present(
            [
                SimpleNamespace(
                    id="art-1",
                    artifact_type="PDF",
                    download_filename="cbc.pdf",
                    original_filename="cbc.pdf",
                    is_primary=True,
                    uploaded_at=datetime(2026, 7, 1, 12, 0, 0),
                    content_type="application/pdf",
                    file_extension="pdf",
                )
            ]
        )
        detail = WorkspaceResponseMapper.to_report_detail(
            _report(),
            clinical_status=ClinicalStatus.AVAILABLE,
            artifact_presentations=presentations,
        )
        payload = detail.to_dict()
        # Round-trip through JSON proves primitives only (no ORM / datetime objects)
        encoded = json.dumps(payload)
        decoded = json.loads(encoded)
        self.assertEqual(decoded["id"], "rep-1")
        self.assertIsInstance(decoded["artifacts"], list)
        self.assertIsInstance(decoded["patient"], dict)

        def _assert_no_orm(value):
            if isinstance(value, dict):
                for v in value.values():
                    _assert_no_orm(v)
            elif isinstance(value, list):
                for v in value:
                    _assert_no_orm(v)
            else:
                self.assertIsInstance(value, (str, int, float, bool, type(None)))

        _assert_no_orm(payload)
