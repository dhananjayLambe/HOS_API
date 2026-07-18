"""WorkspaceListService — orchestrates list only (no ORM / no KPI labels in repo)."""

from __future__ import annotations

import time
from dataclasses import replace
from datetime import date
from typing import Any

from shared.logging import LogModule, logger

from doctor_report_workspace.domain.rows import AwaitingRow, ReportRow
from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.dto import WorkspaceListResponseDTO
from doctor_report_workspace.mappers.workspace_response_mapper import WorkspaceResponseMapper
from doctor_report_workspace.repositories.criteria import WorkspaceListCriteria, WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    ALLOWED_REPORT_ORDERING,
    WorkspaceReportRepository,
)
from doctor_report_workspace.search.normalize import normalize_search_term
from doctor_report_workspace.services.workspace.clinical_status_mapper import ClinicalStatusMapper
from doctor_report_workspace.services.workspace.param_validation import require_uuid_or_none


class WorkspaceListValidationError(ValueError):
    """Invalid list query parameters."""


class WorkspaceListService:
    """List orchestration: scope → one repository source → status → mapper → DTO."""

    def __init__(self, repository: WorkspaceReportRepository | None = None):
        self._repository = repository or WorkspaceReportRepository()

    def list_reports(
        self,
        *,
        doctor_id: Any,
        clinic_id: Any,
        params: dict[str, Any],
    ) -> WorkspaceListResponseDTO:
        started = time.perf_counter()
        criteria = self._parse_criteria(params)
        queue = (params.get("queue") or "").strip() or None
        scope = WorkspaceScope(doctor_id=doctor_id, clinic_id=clinic_id)
        page_size = params.get("page_size")
        cursor = params.get("cursor")
        page_number = self._parse_page(params.get("page"))

        if queue == "critical":
            dto = WorkspaceResponseMapper.to_list_response(
                [],
                page=page_number,
                page_size=int(page_size or 25),
                next_cursor=None,
            )
            self._log_ok(started, queue=queue, count=0)
            return dto

        if queue == "awaiting":
            page = self._repository.find_pending_uploads(
                scope, criteria, page_size=page_size, cursor=cursor
            )
        else:
            report_criteria = criteria
            if queue == "reports_ready":
                report_criteria = replace(criteria, clinical_ready_only=True)
            elif criteria.quick_filter == "reports_ready":
                report_criteria = replace(criteria, clinical_ready_only=True)
            elif criteria.quick_filter == "awaiting":
                # quick_filter awaiting on default reports source → empty; use pending uploads
                page = self._repository.find_pending_uploads(
                    scope, criteria, page_size=page_size, cursor=cursor
                )
                dtos = [
                    self._map_row(row)
                    for row in page.rows
                ]
                dto = WorkspaceResponseMapper.to_list_response(
                    dtos,
                    page=page_number,
                    page_size=page.page_size,
                    next_cursor=page.next_cursor,
                )
                self._log_ok(started, queue=queue, count=len(dtos))
                return dto

            page = self._repository.find_reports(
                scope, report_criteria, page_size=page_size, cursor=cursor
            )

        dtos = [self._map_row(row) for row in page.rows]
        dto = WorkspaceResponseMapper.to_list_response(
            dtos,
            page=page_number,
            page_size=page.page_size,
            next_cursor=page.next_cursor,
        )
        self._log_ok(started, queue=queue, count=len(dtos))
        return dto

    def _map_row(self, row: ReportRow | AwaitingRow):
        if isinstance(row, AwaitingRow) or getattr(row, "kind", None) == "awaiting":
            status = ClinicalStatusMapper.awaiting()
        else:
            status = ClinicalStatusMapper.map_report(
                report=row.source,
                has_artifact=bool(getattr(row, "has_artifact", False)),
            )
        return WorkspaceResponseMapper.map(row, clinical_status=status)

    def _parse_criteria(self, params: dict[str, Any]) -> WorkspaceListCriteria:
        ordering = (params.get("ordering") or "-uploaded_at").strip()
        if ordering not in ALLOWED_REPORT_ORDERING:
            raise WorkspaceListValidationError(
                f"Invalid ordering '{ordering}'. Allowed: {', '.join(sorted(ALLOWED_REPORT_ORDERING))}."
            )

        status = (params.get("status") or "").strip() or None
        if status and status not in ClinicalStatus.ALL:
            raise WorkspaceListValidationError(
                f"Invalid status '{status}'. Allowed: {', '.join(sorted(ClinicalStatus.ALL))}."
            )

        quick_filter = (params.get("quick_filter") or "").strip() or None
        allowed_quick = {None, "my_patients", "reports_ready", "awaiting", "today"}
        if quick_filter not in allowed_quick:
            raise WorkspaceListValidationError(f"Invalid quick_filter '{quick_filter}'.")

        try:
            lab_raw = (params.get("lab") or params.get("branch") or "").strip() or None
            lab_id = require_uuid_or_none(lab_raw, field="lab/branch")
            doctor_id = require_uuid_or_none(
                (params.get("doctor") or "").strip() or None, field="doctor"
            )
            patient_id = require_uuid_or_none(
                (params.get("patient_id") or "").strip() or None, field="patient_id"
            )
            consultation_id = require_uuid_or_none(
                (params.get("consultation_id") or "").strip() or None,
                field="consultation_id",
            )
            encounter_id = require_uuid_or_none(
                (params.get("encounter_id") or "").strip() or None, field="encounter_id"
            )
        except ValueError as exc:
            raise WorkspaceListValidationError(str(exc)) from exc

        date_from = self._parse_date(params.get("date_from"))
        date_to = self._parse_date(params.get("date_to"))
        if date_from and date_to and date_from > date_to:
            raise WorkspaceListValidationError(
                "date_from must be on or before date_to."
            )

        return WorkspaceListCriteria(
            q=normalize_search_term(params.get("q") or params.get("search") or "") or None,
            patient_id=patient_id,
            consultation_id=consultation_id,
            encounter_id=encounter_id,
            doctor_id=doctor_id,
            lab_id=lab_id,
            category=(params.get("category") or "").strip() or None,
            status=status,
            date_from=date_from,
            date_to=date_to,
            quick_filter=quick_filter,
            ordering=ordering,
        )

    @staticmethod
    def _parse_date(raw: Any) -> date | None:
        if not raw:
            return None
        if isinstance(raw, date):
            return raw
        try:
            return date.fromisoformat(str(raw)[:10])
        except ValueError as exc:
            raise WorkspaceListValidationError(f"Invalid date '{raw}'.") from exc

    @staticmethod
    def _parse_page(raw: Any) -> int:
        try:
            page = int(raw or 1)
        except (TypeError, ValueError):
            return 1
        return max(page, 1)

    @staticmethod
    def _log_ok(started: float, *, queue: str | None, count: int) -> None:
        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Workspace list completed",
            module=LogModule.REPORTS,
            action="doctor_report_workspace.list",
            metadata={
                "queue": queue,
                "row_count": count,
                "duration_ms": duration_ms,
            },
        )
