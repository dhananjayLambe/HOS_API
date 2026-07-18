"""Patient Lab History service — reuses WorkspaceReportRepository only.

Access rule: Doctor → Clinic → Reports.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime
from typing import Any

from django.utils import timezone

from consultations_core.models.prescription import Prescription, PrescriptionStatus
from doctor_report_workspace.domain.rows import AwaitingRow, ReportRow
from doctor_report_workspace.dto.patient_lab_history_dto import (
    PatientLabHistoryDetailDTO,
    PatientLabHistoryItemDTO,
    PatientLabHistoryListResponseDTO,
    PatientLabHistorySummaryDTO,
    PatientLabTimelineEventDTO,
)
from doctor_report_workspace.repositories.criteria import WorkspaceListCriteria, WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
)
from doctor_report_workspace.services.patient_lab_history.patient_lab_history_mapper import (
    PatientLabHistoryMapper,
    _lifecycle_state,
    _map_source,
    _version_fields,
)
from doctor_report_workspace.services.workspace.clinical_status_mapper import ClinicalStatusMapper
from doctor_report_workspace.services.workspace.param_validation import require_uuid_or_none
from doctor_report_workspace.services.workspace.workspace_list_service import (
    WorkspaceListService,
    WorkspaceListValidationError,
)
from doctor_report_workspace.services.workspace.workspace_report_detail_service import (
    WorkspaceReportDetailService,
    WorkspaceReportDetailValidationError,
    WorkspaceReportNotFound,
)


def _parse_iso_dt(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _date_label_from_iso(value: str | None) -> str:
    dt = _parse_iso_dt(value)
    if dt is None:
        return value[:10] if value and len(value) >= 10 else (value or "")
    return _format_local_date(dt)


class PatientLabHistoryValidationError(ValueError):
    """Invalid patient lab history parameters."""


class PatientLabHistoryNotFound(LookupError):
    """Report not found or out of clinic scope."""


def _format_local_date(dt) -> str:
    if dt is None:
        return ""
    if hasattr(dt, "date"):
        d = timezone.localtime(dt).date() if timezone.is_aware(dt) else dt.date()
    else:
        d = dt
    return d.strftime("%d %b %Y")


def _clinical_sort_ts(item: PatientLabHistoryItemDTO) -> str:
    """Report date → collection date → upload date."""
    return item.report_date or item.collection_date or item.uploaded_at or ""


class PatientLabHistoryService:
    """Orchestrates patient-scoped lab history via shared workspace repository."""

    def __init__(self, repository: WorkspaceReportRepository | None = None):
        self._repository = repository or WorkspaceReportRepository()
        self._list_parser = WorkspaceListService(repository=self._repository)
        self._detail = WorkspaceReportDetailService(repository=self._repository)

    def get_summary(
        self,
        *,
        doctor_id: Any,
        clinic_id: Any,
        patient_id: Any,
    ) -> PatientLabHistorySummaryDTO:
        patient_uuid = self._require_patient_id(patient_id)
        scope = WorkspaceScope(doctor_id=doctor_id, clinic_id=clinic_id)
        base = WorkspaceListCriteria(patient_id=patient_uuid, ordering="-uploaded_at")

        ready_criteria = replace(base, clinical_ready_only=True, status=None)
        total_reports = self._repository.count_reports(scope, ready_criteria)
        pending = self._repository.count_pending_uploads(scope, base)

        latest_date = None
        latest_lab = None
        if total_reports > 0:
            page = self._repository.find_reports(
                scope,
                replace(base, clinical_ready_only=True),
                page_size=1,
                cursor=None,
            )
            if page.rows:
                item = self._map_row(page.rows[0])
                latest_lab = item.lab_name or item.test_name
                raw = item.report_date or item.collection_date or item.uploaded_at
                if raw:
                    latest_date = _date_label_from_iso(raw)

        return PatientLabHistoryMapper.to_summary(
            total_reports=total_reports,
            pending=pending,
            latest_date=latest_date,
            latest_lab=latest_lab,
        )

    def list_history(
        self,
        *,
        doctor_id: Any,
        clinic_id: Any,
        patient_id: Any,
        params: dict[str, Any] | None = None,
    ) -> PatientLabHistoryListResponseDTO:
        patient_uuid = self._require_patient_id(patient_id)
        params = dict(params or {})
        params["patient_id"] = patient_uuid
        try:
            criteria = self._list_parser._parse_criteria(params)
        except WorkspaceListValidationError as exc:
            raise PatientLabHistoryValidationError(str(exc)) from exc

        # Force patient scope even if parser cleared it
        criteria = replace(criteria, patient_id=patient_uuid)
        scope = WorkspaceScope(doctor_id=doctor_id, clinic_id=clinic_id)
        page_size = params.get("page_size")
        cursor = params.get("cursor")
        status_filter = (params.get("status") or "").strip() or None

        if status_filter == "AWAITING_REPORT":
            page = self._repository.find_pending_uploads(
                scope, criteria, page_size=page_size, cursor=cursor
            )
        else:
            report_criteria = criteria
            if status_filter in ("AVAILABLE", "UPDATED"):
                report_criteria = replace(criteria, status=status_filter, clinical_ready_only=True)
            page = self._repository.find_reports(
                scope, report_criteria, page_size=page_size, cursor=cursor
            )

        rx_map = self._prescription_map_for_patient(patient_uuid)
        items = [self._map_row(row, prescription_by_consultation=rx_map) for row in page.rows]
        # Prefer clinical date ordering (report → collection → upload), newest first
        items.sort(key=_clinical_sort_ts, reverse=True)

        return PatientLabHistoryMapper.to_list_response(
            items,
            next_cursor=page.next_cursor,
            page_size=page.page_size,
        )

    def get_detail(
        self,
        *,
        doctor_id: Any,
        clinic_id: Any,
        patient_id: Any,
        report_id: Any,
    ) -> PatientLabHistoryDetailDTO:
        patient_uuid = self._require_patient_id(patient_id)
        try:
            workspace_dto = self._detail.get_detail(
                doctor_id=doctor_id,
                clinic_id=clinic_id,
                report_id=report_id,
            )
        except WorkspaceReportDetailValidationError as exc:
            raise PatientLabHistoryValidationError(str(exc)) from exc
        except WorkspaceReportNotFound as exc:
            raise PatientLabHistoryNotFound(str(exc)) from exc

        # Enforce patient scope on detail
        if workspace_dto.patient and str(workspace_dto.patient.id) != str(patient_uuid):
            raise PatientLabHistoryNotFound("Report not found.")

        rx_map = self._prescription_map_for_patient(patient_uuid)
        prescription_id = None
        if workspace_dto.consultation_id:
            prescription_id = rx_map.get(str(workspace_dto.consultation_id))

        detail = PatientLabHistoryMapper.to_detail_from_workspace_detail(
            workspace_dto,
            prescription_id=prescription_id,
        )

        # Enrich version/source from repository aggregate when possible
        scope = WorkspaceScope(doctor_id=doctor_id, clinic_id=clinic_id)
        aggregate = self._repository.get_report_detail(scope, report_id)
        if aggregate is not None:
            report = aggregate.report
            version, is_latest, superseded_by = _version_fields(report, is_awaiting=False)
            return PatientLabHistoryDetailDTO(
                id=detail.id,
                report_number=detail.report_number,
                test_name=detail.test_name,
                category=detail.category,
                lab_name=detail.lab_name,
                branch_name=detail.branch_name,
                doctor_name=detail.doctor_name,
                consultation_id=detail.consultation_id,
                consultation_label=detail.consultation_label,
                prescription_id=prescription_id,
                encounter_id=detail.encounter_id,
                collection_date=detail.collection_date,
                report_date=detail.report_date,
                uploaded_at=detail.uploaded_at,
                clinical_status=detail.clinical_status,
                clinical_findings=detail.clinical_findings,
                clinical_findings_preview=detail.clinical_findings_preview,
                version=version,
                is_latest=is_latest,
                superseded_by_id=superseded_by,
                source=_map_source(report, is_awaiting=False),
                lifecycle_state=_lifecycle_state(report, is_awaiting=False),
                artifacts=detail.artifacts,
                timeline=detail.timeline,
            )
        return detail

    def timeline_events(
        self,
        *,
        doctor_id: Any,
        clinic_id: Any,
        patient_id: Any,
        limit: int = 15,
    ) -> list[PatientLabTimelineEventDTO]:
        """Clinic-scoped lab events for Visit Timeline merge."""
        patient_uuid = self._require_patient_id(patient_id)
        scope = WorkspaceScope(doctor_id=doctor_id, clinic_id=clinic_id)
        criteria = WorkspaceListCriteria(patient_id=patient_uuid, ordering="-uploaded_at")

        events: list[PatientLabTimelineEventDTO] = []

        ready_page = self._repository.find_reports(
            scope,
            replace(criteria, clinical_ready_only=True),
            page_size=limit,
            cursor=None,
        )
        for row in ready_page.rows:
            item = self._map_row(row)
            ts = item.report_date or item.collection_date or item.uploaded_at
            if not ts:
                continue
            if item.clinical_status == "UPDATED":
                title = "Lab report updated"
                detail = f"{item.test_name} · version {item.version}"
            else:
                title = "Lab report available"
                detail = f"{item.test_name}" + (f" · {item.lab_name}" if item.lab_name else "")
            events.append(
                PatientLabTimelineEventDTO(
                    id=f"lab-{item.id}",
                    kind="lab_report",
                    report_id=item.id,
                    event=title,
                    detail=detail,
                    timestamp=ts,
                    date_label=_date_label_from_iso(ts),
                )
            )

        awaiting_page = self._repository.find_pending_uploads(
            scope, criteria, page_size=min(limit, 10), cursor=None
        )
        for row in awaiting_page.rows:
            item = self._map_row(row)
            ts = item.collection_date or item.uploaded_at
            # Use now-ish fallback for sort when no dates
            if not ts:
                ts = timezone.now().isoformat()
            events.append(
                PatientLabTimelineEventDTO(
                    id=f"lab-await-{item.id}",
                    kind="lab_report",
                    report_id=None,
                    event="Lab report awaiting",
                    detail=f"{item.test_name} · pending",
                    timestamp=ts,
                    date_label=_date_label_from_iso(ts) or "Pending",
                )
            )

        def sort_key(e: PatientLabTimelineEventDTO):
            return e.timestamp or ""

        events.sort(key=sort_key, reverse=True)
        return events[:limit]

    def _map_row(
        self,
        row: ReportRow | AwaitingRow,
        *,
        prescription_by_consultation: dict[str, str] | None = None,
    ) -> PatientLabHistoryItemDTO:
        if isinstance(row, AwaitingRow) or getattr(row, "kind", None) == "awaiting":
            status = ClinicalStatusMapper.awaiting()
        else:
            status = ClinicalStatusMapper.map_report(
                report=row.source,
                has_artifact=bool(getattr(row, "has_artifact", False)),
            )
        return PatientLabHistoryMapper.to_item_from_report_row(
            row,
            clinical_status=status,
            prescription_by_consultation=prescription_by_consultation,
        )

    def _prescription_map_for_patient(self, patient_id: str) -> dict[str, str]:
        qs = (
            Prescription.objects.filter(
                consultation__encounter__patient_profile_id=patient_id,
                status=PrescriptionStatus.FINALIZED,
            )
            .order_by("-finalized_at")
            .values_list("consultation_id", "id")[:200]
        )
        out: dict[str, str] = {}
        for consultation_id, rx_id in qs:
            key = str(consultation_id)
            if key not in out:
                out[key] = str(rx_id)
        return out

    def _require_patient_id(self, patient_id: Any) -> str:
        try:
            value = require_uuid_or_none(
                str(patient_id) if patient_id is not None else None,
                field="patient_id",
            )
        except ValueError as exc:
            raise PatientLabHistoryValidationError(str(exc)) from exc
        if not value:
            raise PatientLabHistoryValidationError("patient_id is required.")
        return str(value)
