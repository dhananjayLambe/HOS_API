"""Request context container for report operational API views."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from labs.models.lab_auth import LabUser


@dataclass(frozen=True)
class ReportRequestContext:
    lab_user: LabUser
    branch_id: object
    request_id: str
