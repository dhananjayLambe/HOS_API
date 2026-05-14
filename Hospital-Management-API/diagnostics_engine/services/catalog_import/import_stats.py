from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ImportStats:
    """Aggregate counters for a catalog sync run."""

    created: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0

    def merge(self, other: ImportStats) -> None:
        self.created += other.created
        self.updated += other.updated
        self.skipped += other.skipped
        self.failed += other.failed


@dataclass
class ImportRunResult:
    """Stats plus human-readable errors (row-level failures do not always abort)."""

    stats: ImportStats = field(default_factory=ImportStats)
    errors: list[str] = field(default_factory=list)

    def merge(self, other: ImportRunResult) -> None:
        self.stats.merge(other.stats)
        self.errors.extend(other.errors)
