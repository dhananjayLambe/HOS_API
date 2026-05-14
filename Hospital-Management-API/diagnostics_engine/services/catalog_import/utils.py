from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)


def default_data_dir() -> Path:
    """Built-in CSV tree: diagnostics_engine/data/."""
    return Path(__file__).resolve().parent.parent.parent / "data"


@dataclass(frozen=True)
class CsvRow:
    """One logical CSV row with source location for errors."""

    cells: dict[str, str]
    path: Path
    line_no: int

    def get(self, key: str, default: str = "") -> str:
        return (self.cells.get(key) or default).strip()

    def ref(self) -> str:
        return f"{self.path.name}:{self.line_no}"


def strip_row(row: dict[str, str | None]) -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in row.items():
        if k is None:
            continue
        key = str(k).strip()
        if not key:
            continue
        out[key] = (v or "").strip()
    return out


def row_is_empty(cells: dict[str, str]) -> bool:
    return not any(v for v in cells.values())


def read_csv_rows(path: Path) -> list[CsvRow]:
    """Read CSV as DictReader; skip blank lines; line_no is 1-based file line index."""
    rows: list[CsvRow] = []
    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        if not reader.fieldnames:
            logger.warning("CSV has no header: %s", path)
            return rows
        for line_no, raw in enumerate(reader, start=2):
            cells = strip_row(raw)
            if row_is_empty(cells):
                continue
            rows.append(CsvRow(cells=cells, path=path, line_no=line_no))
    return rows


def parse_csv_ordering_int(row: CsvRow) -> int:
    """CSV `ordering` column: sort key only; invalid values are import errors."""
    raw = row.get("ordering", "0")
    if raw == "":
        return 0
    try:
        return int(raw)
    except ValueError as exc:
        raise ValueError(f"invalid ordering {raw!r}") from exc


def sort_rows_by_csv_ordering(rows: Iterable[CsvRow]) -> list[CsvRow]:
    """Stable deterministic processing order; DB models are not updated from this column."""
    return sorted(rows, key=parse_csv_ordering_int)


def resolve_input_path(arg: str, *, data_dir: Path) -> Path:
    """Resolve --file: absolute path wins; else cwd; else under data_dir."""
    p = Path(arg).expanduser()
    if p.is_file():
        return p.resolve()
    cwd = Path.cwd() / p
    if cwd.is_file():
        return cwd.resolve()
    under_data = (data_dir / p).resolve()
    if under_data.is_file():
        return under_data
    raise FileNotFoundError(f"CSV not found: {arg!r}")


def parse_bool(value: str, *, row_ref: str, field: str) -> bool:
    v = (value or "").strip().lower()
    if v in ("true", "1", "yes", "y", "t"):
        return True
    if v in ("false", "0", "no", "n", "f", ""):
        return False
    raise ValueError(f"{row_ref}: invalid boolean for {field}: {value!r}")


def parse_positive_int(value: str, *, row_ref: str, field: str, default: int | None = None) -> int:
    raw = (value or "").strip()
    if raw == "" and default is not None:
        return default
    if raw == "":
        raise ValueError(f"{row_ref}: missing {field}")
    try:
        n = int(raw)
    except ValueError as exc:
        raise ValueError(f"{row_ref}: invalid integer for {field}: {value!r}") from exc
    if n < 0:
        raise ValueError(f"{row_ref}: {field} must be non-negative, got {n}")
    return n


def discover_csv_files(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    return sorted(directory.glob("*.csv"))
