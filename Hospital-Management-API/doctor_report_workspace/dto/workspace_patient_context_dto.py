"""Patient context shown throughout the doctor report workspace."""

from __future__ import annotations

from dataclasses import dataclass

from doctor_report_workspace.dto.base import BaseDTO


@dataclass(frozen=True)
class WorkspacePatientContextDTO(BaseDTO):
    id: str
    name: str
    age: int | None
    gender: str
    identifier: str
    mobile: str | None
    last_visit_at: str | None
    current_consultation_id: str | None
    current_consultation_label: str | None
