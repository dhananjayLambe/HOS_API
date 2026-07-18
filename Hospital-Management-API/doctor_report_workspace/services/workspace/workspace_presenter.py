"""WorkspacePresenter — list / summary / counts via WorkspaceResponseMapper."""

from __future__ import annotations

from typing import Any

from doctor_report_workspace.mappers.workspace_response_mapper import WorkspaceResponseMapper


class WorkspacePresenter:
    """Thin adapter: mapper → to_dict(). Never builds response dicts by hand."""

    def present_summary_row(self, *, report: Any, clinical_status: str) -> dict:
        dto = WorkspaceResponseMapper.to_report_from_report_object(
            report,
            clinical_status=clinical_status,
        )
        return dto.to_dict()

    def present_queue_counts(
        self, *, reports_ready: int, awaiting: int, critical: int = 0
    ) -> dict:
        dto = WorkspaceResponseMapper.to_summary(
            reports_ready=reports_ready,
            awaiting=awaiting,
            critical=critical,
            as_response=True,
        )
        return dto.to_dict()

    def present_patient_context(self, *, patient: Any, **context_kwargs: Any) -> dict:
        dto = WorkspaceResponseMapper.to_patient_context(patient, **context_kwargs)
        return dto.to_dict()

    def present_list(
        self,
        *,
        reports: list[Any],
        clinical_statuses: list[str],
        page: int,
        page_size: int,
        next_cursor: str | None = None,
    ) -> dict:
        report_dtos = [
            WorkspaceResponseMapper.to_report_from_report_object(
                report,
                clinical_status=status,
            )
            for report, status in zip(reports, clinical_statuses, strict=True)
        ]
        dto = WorkspaceResponseMapper.to_list_response(
            report_dtos,
            page=page,
            page_size=page_size,
            next_cursor=next_cursor,
        )
        return dto.to_dict()

    def present_filters(
        self,
        *,
        statuses: list[str],
        labs: list[str],
        categories: list[str],
        doctors: list[str],
        branches: list[str],
    ) -> dict:
        dto = WorkspaceResponseMapper.to_filters(
            statuses=statuses,
            labs=labs,
            categories=categories,
            doctors=doctors,
            branches=branches,
            as_response=True,
        )
        return dto.to_dict()
