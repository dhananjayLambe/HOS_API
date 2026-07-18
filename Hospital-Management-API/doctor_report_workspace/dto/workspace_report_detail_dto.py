"""Detail drawer DTO (report row + artifacts + timeline + findings)."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO
from doctor_report_workspace.dto.workspace_artifact_dto import WorkspaceArtifactDTO
from doctor_report_workspace.dto.workspace_patient_context_dto import WorkspacePatientContextDTO
from doctor_report_workspace.dto.workspace_timeline_dto import WorkspaceTimelineDTO


@dataclass(frozen=True)
class WorkspaceReportDetailDTO(BaseDTO):
    id: str
    report_number: str | None
    patient: WorkspacePatientContextDTO
    test_name: str
    category: str | None
    lab_name: str | None
    branch_name: str | None
    doctor_name: str | None
    consultation_id: str | None
    consultation_label: str | None
    encounter_id: str | None
    collection_date: str | None
    report_date: str | None
    uploaded_at: str | None
    clinical_status: str
    clinical_findings_preview: str | None
    artifacts: tuple[WorkspaceArtifactDTO, ...]
    timeline: WorkspaceTimelineDTO
    clinical_findings: str | None
