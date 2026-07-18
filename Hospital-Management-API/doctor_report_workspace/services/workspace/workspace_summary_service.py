"""WorkspaceSummaryService — KPI counts only (separate from list)."""

from __future__ import annotations

import time
from dataclasses import replace
from typing import Any

from shared.logging import LogModule, logger

from doctor_report_workspace.mappers.workspace_response_mapper import WorkspaceResponseMapper
from doctor_report_workspace.repositories.criteria import WorkspaceListCriteria, WorkspaceScope
from doctor_report_workspace.repositories.workspace_report_repository import (
    WorkspaceReportRepository,
)
from doctor_report_workspace.services.workspace.workspace_list_service import (
    WorkspaceListService,
    WorkspaceListValidationError,
)


class WorkspaceSummaryService:
    """Summary orchestration: count_reports → reports_ready; pending → awaiting."""

    def __init__(self, repository: WorkspaceReportRepository | None = None):
        self._repository = repository or WorkspaceReportRepository()
        self._list_parser = WorkspaceListService(repository=self._repository)

    def get_summary(
        self,
        *,
        doctor_id: Any,
        clinic_id: Any,
        params: dict[str, Any],
    ):
        started = time.perf_counter()
        # Reuse list param validation/parsing without queue branching
        try:
            criteria: WorkspaceListCriteria = self._list_parser._parse_criteria(params)
        except WorkspaceListValidationError:
            raise

        scope = WorkspaceScope(doctor_id=doctor_id, clinic_id=clinic_id)
        ready_criteria = replace(
            criteria,
            clinical_ready_only=True,
            clinical_awaiting_only=False,
            status=None,
            quick_filter=None if criteria.quick_filter in ("reports_ready", "awaiting") else criteria.quick_filter,
        )
        awaiting_criteria = replace(
            criteria,
            clinical_ready_only=False,
            clinical_awaiting_only=False,
            status=None,
            quick_filter=None if criteria.quick_filter in ("reports_ready", "awaiting") else criteria.quick_filter,
        )

        reports_ready = self._repository.count_reports(scope, ready_criteria)
        awaiting = self._repository.count_pending_uploads(scope, awaiting_criteria)

        dto = WorkspaceResponseMapper.to_summary(
            reports_ready=reports_ready,
            awaiting=awaiting,
            critical=0,
            as_response=True,
        )
        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Workspace summary completed",
            module=LogModule.REPORTS,
            action="doctor_report_workspace.summary",
            metadata={
                "reports_ready": reports_ready,
                "awaiting": awaiting,
                "duration_ms": duration_ms,
            },
        )
        return dto
