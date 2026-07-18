"""Domain row abstractions for workspace list mapping.

Repository returns these evaluated rows. Services pass them to
WorkspaceResponseMapper.map — never open QuerySets.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class WorkspaceRow(Protocol):
    """Common contract for listable workspace rows."""

    @property
    def row_id(self) -> str: ...

    @property
    def kind(self) -> str: ...

    @property
    def has_artifact(self) -> bool: ...

    @property
    def source(self) -> Any: ...


@dataclass(frozen=True)
class ReportRow:
    """Active DiagnosticTestReport head for the workspace list."""

    report: Any
    has_artifact: bool = False

    @property
    def row_id(self) -> str:
        return str(self.report.id)

    @property
    def kind(self) -> str:
        return "report"

    @property
    def source(self) -> Any:
        return self.report


@dataclass(frozen=True)
class AwaitingRow:
    """Completed test line with no active report (pending upload)."""

    line: Any

    @property
    def row_id(self) -> str:
        return str(self.line.id)

    @property
    def kind(self) -> str:
        return "awaiting"

    @property
    def has_artifact(self) -> bool:
        return False

    @property
    def source(self) -> Any:
        return self.line
