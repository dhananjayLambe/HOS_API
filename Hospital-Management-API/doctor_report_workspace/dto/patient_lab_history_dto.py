"""Patient Lab History DTOs — stable contract for Patient Summary surfaces.

Access rule (permanent): Doctor → Clinic → Reports.
Never expose cross-clinic patient reports without explicit patient sharing.
"""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO
from doctor_report_workspace.dto.workspace_artifact_dto import WorkspaceArtifactDTO
from doctor_report_workspace.dto.workspace_timeline_dto import WorkspaceTimelineDTO


@dataclass(frozen=True)
class PatientLabHistorySummaryDTO(BaseDTO):
    """Backend-owned KPIs — single formula for header, Overview, Lab History."""

    total_reports: int
    pending: int
    latest_date: str | None
    latest_lab: str | None


@dataclass(frozen=True)
class PatientLabHistoryItemDTO(BaseDTO):
    """List card DTO — everything needed for a timeline card (no N+1)."""

    id: str
    report_number: str | None
    test_name: str
    category: str | None
    lab_name: str | None
    branch_name: str | None
    doctor_name: str | None
    consultation_id: str | None
    consultation_label: str | None
    prescription_id: str | None
    encounter_id: str | None
    collection_date: str | None
    report_date: str | None
    uploaded_at: str | None
    clinical_status: str
    clinical_findings_preview: str | None
    version: int
    is_latest: bool
    superseded_by_id: str | None
    source: str
    lifecycle_state: str
    primary_artifact_kind: str | None
    artifact_count: int


@dataclass(frozen=True)
class PatientLabHistoryListResponseDTO(BaseDTO):
    items: tuple[PatientLabHistoryItemDTO, ...]
    next_cursor: str | None
    page_size: int


@dataclass(frozen=True)
class PatientLabHistoryDetailDTO(BaseDTO):
    """Detail for preview — fetched on demand only."""

    id: str
    report_number: str | None
    test_name: str
    category: str | None
    lab_name: str | None
    branch_name: str | None
    doctor_name: str | None
    consultation_id: str | None
    consultation_label: str | None
    prescription_id: str | None
    encounter_id: str | None
    collection_date: str | None
    report_date: str | None
    uploaded_at: str | None
    clinical_status: str
    clinical_findings: str | None
    clinical_findings_preview: str | None
    version: int
    is_latest: bool
    superseded_by_id: str | None
    source: str
    lifecycle_state: str
    artifacts: tuple[WorkspaceArtifactDTO, ...]
    timeline: WorkspaceTimelineDTO


@dataclass(frozen=True)
class PatientLabTimelineEventDTO(BaseDTO):
    """Projection for Visit Timeline merge."""

    id: str
    kind: str
    report_id: str | None
    event: str
    detail: str
    timestamp: str
    date_label: str
