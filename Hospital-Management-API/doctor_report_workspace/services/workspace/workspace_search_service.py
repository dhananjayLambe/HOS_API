"""WorkspaceSearchService — dedicated search use case over report aggregate."""

from __future__ import annotations

import time
from datetime import date
from typing import Any

from shared.logging import LogModule, logger

from doctor_report_workspace.dto import WorkspaceListResponseDTO
from doctor_report_workspace.mappers.workspace_response_mapper import WorkspaceResponseMapper
from doctor_report_workspace.repositories.criteria import WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    ALLOWED_REPORT_ORDERING,
    WorkspaceReportRepository,
)
from doctor_report_workspace.domain.statuses import ClinicalStatus
from doctor_report_workspace.search.criteria import WorkspaceSearchCriteria
from doctor_report_workspace.search.normalize import normalize_search_term
from doctor_report_workspace.services.workspace.clinical_status_mapper import ClinicalStatusMapper
from doctor_report_workspace.services.workspace.param_validation import require_uuid_or_none

MIN_SEARCH_LENGTH = 2


class WorkspaceSearchValidationError(ValueError):
    """Invalid search request."""


class WorkspaceSearchService:
    """Validate → normalize → repository.search_reports → status → mapper → list DTO."""

    def __init__(self, repository: WorkspaceReportRepository | None = None):
        self._repository = repository or WorkspaceReportRepository()

    def search(
        self,
        *,
        doctor_id: Any,
        clinic_id: Any,
        params: dict[str, Any],
    ) -> WorkspaceListResponseDTO:
        started = time.perf_counter()
        criteria = self._build_criteria(params)
        scope = WorkspaceScope(doctor_id=doctor_id, clinic_id=clinic_id)
        page = self._repository.search_reports(scope, criteria)

        report_dtos = []
        for row in page.rows:
            status = ClinicalStatusMapper.map_report(
                report=row.source,
                has_artifact=bool(getattr(row, "has_artifact", False)),
            )
            report_dtos.append(
                WorkspaceResponseMapper.map(row, clinical_status=status)
            )

        dto = WorkspaceResponseMapper.to_list_response(
            report_dtos,
            page=self._parse_page(params.get("page")),
            page_size=page.page_size,
            next_cursor=page.next_cursor,
        )
        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Workspace search completed",
            module=LogModule.REPORTS,
            action="doctor_report_workspace.search",
            metadata={
                "clinic_id": str(clinic_id),
                "term_length": len(criteria.q),
                "row_count": len(report_dtos),
                "duration_ms": duration_ms,
            },
        )
        return dto

    def _build_criteria(self, params: dict[str, Any]) -> WorkspaceSearchCriteria:
        raw = params.get("q") if params.get("q") is not None else params.get("search")
        normalized = normalize_search_term(raw if raw is not None else "")
        if not normalized:
            raise WorkspaceSearchValidationError("q is required.")
        if len(normalized) < MIN_SEARCH_LENGTH:
            raise WorkspaceSearchValidationError(
                f"q must be at least {MIN_SEARCH_LENGTH} characters."
            )

        ordering = (params.get("ordering") or "-uploaded_at").strip()
        if ordering not in ALLOWED_REPORT_ORDERING:
            raise WorkspaceSearchValidationError(
                f"Invalid ordering '{ordering}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_REPORT_ORDERING))}."
            )

        status = (params.get("status") or "").strip() or None
        if status and status not in ClinicalStatus.ALL:
            raise WorkspaceSearchValidationError(
                f"Invalid status '{status}'. Allowed: {', '.join(sorted(ClinicalStatus.ALL))}."
            )

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
            raise WorkspaceSearchValidationError(str(exc)) from exc

        date_from = self._parse_date(params.get("date_from"))
        date_to = self._parse_date(params.get("date_to"))
        if date_from and date_to and date_from > date_to:
            raise WorkspaceSearchValidationError(
                "date_from must be on or before date_to."
            )

        return WorkspaceSearchCriteria(
            q=normalized,
            ordering=ordering,
            cursor=(params.get("cursor") or "").strip() or None,
            page_size=params.get("page_size"),
            patient_id=patient_id,
            consultation_id=consultation_id,
            encounter_id=encounter_id,
            doctor_id=doctor_id,
            lab_id=lab_id,
            category=(params.get("category") or "").strip() or None,
            status=status,
            date_from=date_from,
            date_to=date_to,
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
            raise WorkspaceSearchValidationError(f"Invalid date '{raw}'.") from exc

    @staticmethod
    def _parse_page(raw: Any) -> int:
        try:
            page = int(raw or 1)
        except (TypeError, ValueError):
            return 1
        return max(page, 1)
