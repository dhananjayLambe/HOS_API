"""Map workspace rows → Patient Lab History DTOs (no ORM queries)."""

from __future__ import annotations

from typing import Any

from diagnostics_engine.models.reports import ArtifactSourceType
from doctor_report_workspace.dto.patient_lab_history_dto import (
    PatientLabHistoryDetailDTO,
    PatientLabHistoryItemDTO,
    PatientLabHistoryListResponseDTO,
    PatientLabHistorySummaryDTO,
)
from doctor_report_workspace.dto.workspace_timeline_dto import WorkspaceTimelineDTO
from doctor_report_workspace.mappers.workspace_response_mapper import (
    WorkspaceResponseMapper,
    _findings_full,
    _findings_preview,
    _iso,
    _service_category_label,
    _str_id,
)


def _doctor_name(doctor: Any) -> str | None:
    if doctor is None:
        return None
    return getattr(doctor, "name", None) or getattr(doctor, "full_name", None)


def _lab_label(branch: Any) -> str | None:
    if branch is None:
        return None
    return getattr(branch, "branch_name", None) or getattr(branch, "name", None)


def _map_source(report_or_line: Any, *, is_awaiting: bool) -> str:
    if is_awaiting:
        return ArtifactSourceType.LAB_UPLOAD
    report = report_or_line
    artifacts = getattr(report, "artifacts", None)
    if artifacts is not None:
        try:
            primary = None
            for a in artifacts.all() if hasattr(artifacts, "all") else artifacts:
                if getattr(a, "is_deleted", False) or getattr(a, "is_archived", False):
                    continue
                if getattr(a, "is_primary", False):
                    primary = a
                    break
            if primary is None:
                active = [
                    a
                    for a in (artifacts.all() if hasattr(artifacts, "all") else artifacts)
                    if not getattr(a, "is_deleted", False)
                ]
                primary = active[0] if active else None
            if primary is not None:
                return str(getattr(primary, "source_type", None) or ArtifactSourceType.LAB_UPLOAD)
        except Exception:
            pass
    source_system = getattr(report, "source_system", None)
    if source_system:
        return "IMPORTED"
    return ArtifactSourceType.LAB_UPLOAD


def _lifecycle_state(report: Any | None, *, is_awaiting: bool) -> str:
    if is_awaiting:
        return "ACTIVE"
    if report is None:
        return "ACTIVE"
    if getattr(report, "deleted_at", None) is not None:
        return "DELETED"
    return "ACTIVE"


def _artifact_summary(report: Any | None) -> tuple[str | None, int]:
    if report is None:
        return None, 0
    artifacts = getattr(report, "artifacts", None)
    if artifacts is None:
        return None, 0
    try:
        items = list(artifacts.all() if hasattr(artifacts, "all") else artifacts)
    except Exception:
        return None, 0
    active = [
        a
        for a in items
        if not getattr(a, "is_deleted", False)
        and str(getattr(a, "artifact_state", "active")).lower() in ("active", "")
    ]
    if not active:
        return None, 0
    primary = next((a for a in active if getattr(a, "is_primary", False)), active[0])
    kind = str(getattr(primary, "artifact_type", None) or "OTHER")
    return kind, len(active)


def _resolve_prescription_id(consultation_id: Any, prescription_by_consultation: dict[str, str] | None) -> str | None:
    if not consultation_id or not prescription_by_consultation:
        return None
    return prescription_by_consultation.get(str(consultation_id))


def _version_fields(report: Any | None, *, is_awaiting: bool) -> tuple[int, bool, str | None]:
    if is_awaiting or report is None:
        return 1, True, None
    version = int(getattr(report, "revision_number", 1) or 1)
    superseded_by = None
    try:
        child = report.superseded_by_reports.filter(deleted_at__isnull=True).first()
        if child is not None:
            superseded_by = str(child.pk)
    except Exception:
        pass
    is_latest = superseded_by is None
    return version, is_latest, superseded_by


class PatientLabHistoryMapper:
    @staticmethod
    def to_summary(
        *,
        total_reports: int,
        pending: int,
        latest_date: str | None,
        latest_lab: str | None,
    ) -> PatientLabHistorySummaryDTO:
        return PatientLabHistorySummaryDTO(
            total_reports=total_reports,
            pending=pending,
            latest_date=latest_date,
            latest_lab=latest_lab,
        )

    @classmethod
    def to_item_from_report_row(
        cls,
        row: Any,
        *,
        clinical_status: str,
        prescription_by_consultation: dict[str, str] | None = None,
    ) -> PatientLabHistoryItemDTO:
        is_awaiting = getattr(row, "kind", None) == "awaiting"
        source_obj = row.source
        if is_awaiting:
            line = source_obj
            order = getattr(line, "order", None)
            service = getattr(line, "service", None)
            branch = getattr(order, "branch", None) if order else None
            doctor = getattr(order, "doctor", None) if order else None
            encounter = getattr(order, "encounter", None) if order else None
            consultation_id = getattr(order, "consultation_id", None) if order else None
            report = None
            item_id = str(getattr(line, "id"))
            test_name = getattr(service, "name", None) or "Diagnostic report"
            report_number = None
            collection_date = getattr(order, "collected_at", None) if order else None
            report_date = None
            uploaded_at = None
            findings = None
        else:
            report = source_obj
            line = getattr(report, "order_test_line", None)
            order = getattr(line, "order", None) if line else None
            service = getattr(line, "service", None) if line else None
            branch = getattr(order, "branch", None) if order else None
            doctor = getattr(order, "doctor", None) if order else None
            encounter = getattr(order, "encounter", None) if order else None
            consultation_id = getattr(order, "consultation_id", None) if order else None
            item_id = str(getattr(report, "id"))
            test_name = getattr(service, "name", None) or "Diagnostic report"
            report_number = getattr(report, "report_number", None)
            collection_date = getattr(order, "collected_at", None) if order else None
            report_date = getattr(report, "ready_at", None) or getattr(report, "uploaded_at", None)
            uploaded_at = getattr(report, "uploaded_at", None)
            findings = _findings_preview(getattr(report, "structured_result", None))

        version, is_latest, superseded_by = _version_fields(report, is_awaiting=is_awaiting)
        kind, count = _artifact_summary(report)
        consultation_label = f"Consultation {consultation_id}" if consultation_id else None

        return PatientLabHistoryItemDTO(
            id=item_id,
            report_number=str(report_number) if report_number else None,
            test_name=test_name,
            category=_service_category_label(service),
            lab_name=_lab_label(branch),
            branch_name=_lab_label(branch),
            doctor_name=_doctor_name(doctor),
            consultation_id=_str_id(consultation_id),
            consultation_label=consultation_label,
            prescription_id=_resolve_prescription_id(consultation_id, prescription_by_consultation),
            encounter_id=_str_id(getattr(encounter, "id", None) if encounter else None),
            collection_date=_iso(collection_date),
            report_date=_iso(report_date),
            uploaded_at=_iso(uploaded_at),
            clinical_status=clinical_status,
            clinical_findings_preview=findings,
            version=version,
            is_latest=is_latest,
            superseded_by_id=superseded_by,
            source=_map_source(source_obj, is_awaiting=is_awaiting),
            lifecycle_state=_lifecycle_state(report, is_awaiting=is_awaiting),
            primary_artifact_kind=kind,
            artifact_count=count,
        )

    @classmethod
    def to_list_response(
        cls,
        items: list[PatientLabHistoryItemDTO],
        *,
        next_cursor: str | None,
        page_size: int,
    ) -> PatientLabHistoryListResponseDTO:
        return PatientLabHistoryListResponseDTO(
            items=tuple(items),
            next_cursor=next_cursor,
            page_size=page_size,
        )

    @classmethod
    def to_detail_from_workspace_detail(
        cls,
        workspace_detail: Any,
        *,
        prescription_id: str | None = None,
    ) -> PatientLabHistoryDetailDTO:
        """Adapt WorkspaceReportDetailDTO → PatientLabHistoryDetailDTO."""
        d = workspace_detail
        version = 1
        is_latest = True
        superseded_by = None
        source = ArtifactSourceType.LAB_UPLOAD
        # Prefer fields already on detail; version/source filled by service when available
        return PatientLabHistoryDetailDTO(
            id=d.id,
            report_number=d.report_number,
            test_name=d.test_name,
            category=d.category,
            lab_name=d.lab_name,
            branch_name=d.branch_name,
            doctor_name=d.doctor_name,
            consultation_id=d.consultation_id,
            consultation_label=d.consultation_label,
            prescription_id=prescription_id,
            encounter_id=d.encounter_id,
            collection_date=d.collection_date,
            report_date=d.report_date,
            uploaded_at=d.uploaded_at,
            clinical_status=d.clinical_status,
            clinical_findings=getattr(d, "clinical_findings", None),
            clinical_findings_preview=getattr(d, "clinical_findings_preview", None),
            version=version,
            is_latest=is_latest,
            superseded_by_id=superseded_by,
            source=source,
            lifecycle_state="ACTIVE",
            artifacts=tuple(getattr(d, "artifacts", ()) or ()),
            timeline=getattr(d, "timeline", None)
            or WorkspaceTimelineDTO(ordered_at=None, collected_at=None, uploaded_at=None),
        )
