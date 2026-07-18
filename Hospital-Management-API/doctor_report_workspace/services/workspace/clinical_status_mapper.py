"""ClinicalStatusMapper — storage lifecycle → doctor-facing clinical status.

Maps ReportLifecycleStatus + revision_number / supersedes to:
AWAITING_REPORT | AVAILABLE | UPDATED.

Never expose internal ready/delivered/rejected values to the frontend.
WorkspaceResponseMapper must not reimplement this logic.
"""

from __future__ import annotations

from typing import Any

from doctor_report_workspace.domain.statuses import ClinicalStatus


class ClinicalStatusMapper:
    """Maps diagnostics storage state to doctor-facing clinical status."""

    @staticmethod
    def map_report(*, report: Any, has_artifact: bool = False) -> str:
        revision = getattr(report, "revision_number", 1) or 1
        supersedes_id = getattr(report, "supersedes_id", None)
        if revision > 1 or supersedes_id:
            return ClinicalStatus.UPDATED
        if has_artifact:
            return ClinicalStatus.AVAILABLE
        status = getattr(report, "status", None)
        # ready/delivered without detected artifact still surface as available
        # when caller did not pass has_artifact; prefer explicit has_artifact.
        if status in ("ready", "delivered", "in_progress") and has_artifact:
            return ClinicalStatus.AVAILABLE
        if status in ("ready", "delivered"):
            return ClinicalStatus.AVAILABLE
        return ClinicalStatus.AWAITING_REPORT

    @staticmethod
    def awaiting() -> str:
        return ClinicalStatus.AWAITING_REPORT
