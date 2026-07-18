"""WorkspaceService — thin facade for views (delegates to list/summary services)."""

from __future__ import annotations

from typing import Any

from doctor_report_workspace.services.workspace.workspace_list_service import WorkspaceListService
from doctor_report_workspace.services.workspace.workspace_summary_service import (
    WorkspaceSummaryService,
)


class WorkspaceService:
    """Optional facade — views may call List/Summary services directly."""

    def __init__(self):
        self._list = WorkspaceListService()
        self._summary = WorkspaceSummaryService()

    def list_reports(self, *, doctor_id: Any, clinic_id: Any, params: dict[str, Any]):
        return self._list.list_reports(
            doctor_id=doctor_id, clinic_id=clinic_id, params=params
        )

    def get_queue_counts(self, *, doctor_id: Any, clinic_id: Any, params: dict[str, Any]):
        return self._summary.get_summary(
            doctor_id=doctor_id, clinic_id=clinic_id, params=params
        )

    def search_patients(self, *, q, scope):
        raise NotImplementedError("Deferred — patients/search not in Milestone 2.")

    def get_report_detail(self, *, report_id, scope):
        raise NotImplementedError("Deferred — report detail not in Milestone 2.")

    def get_preview(self, *, report_id, scope):
        raise NotImplementedError("Deferred — preview not in Milestone 2.")

    def get_download(self, *, report_id, artifact_id, scope):
        raise NotImplementedError("Deferred — download not in Milestone 2.")
