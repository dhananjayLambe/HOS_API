"""
Scan diagnostics_engine/data CSVs for duplicate natural keys.

Used by ``audit_diagnostic_catalog_csvs`` and tests to keep catalog data clean.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DupHit:
    kind: str
    key: str
    locations: list[tuple[str, int]]  # (filename, line_no)


def _service_files(data_dir: Path) -> list[Path]:
    d = data_dir / "services"
    return sorted(d.glob("*.csv")) if d.is_dir() else []


def find_duplicate_service_codes(data_dir: Path) -> list[DupHit]:
    """Globally unique ``code`` across all ``data/services/*.csv``."""
    locs: dict[str, list[tuple[str, int]]] = {}
    for path in _service_files(data_dir):
        with path.open(newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for line_no, row in enumerate(reader, start=2):
                code = (row.get("code") or "").strip()
                if not code:
                    continue
                locs.setdefault(code, []).append((path.name, line_no))
    return [DupHit("service_code", k, v) for k, v in sorted(locs.items()) if len(v) > 1]


def find_duplicate_package_keys(data_dir: Path) -> list[DupHit]:
    """Unique (lineage_code, version) across ``data/packages/*.csv``."""
    locs: dict[str, list[tuple[str, int]]] = {}
    d = data_dir / "packages"
    if not d.is_dir():
        return []
    for path in sorted(d.glob("*.csv")):
        with path.open(newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for line_no, row in enumerate(reader, start=2):
                lc = (row.get("lineage_code") or "").strip()
                ver = (row.get("version") or "").strip()
                if not lc:
                    continue
                key = f"{lc}@{ver}"
                locs.setdefault(key, []).append((path.name, line_no))
    return [DupHit("package_lineage_version", k, v) for k, v in sorted(locs.items()) if len(v) > 1]


def find_duplicate_package_item_keys(data_dir: Path) -> list[DupHit]:
    """Unique (package_code, service_code) across ``data/package_items/*.csv``."""
    locs: dict[str, list[tuple[str, int]]] = {}
    d = data_dir / "package_items"
    if not d.is_dir():
        return []
    for path in sorted(d.glob("*.csv")):
        with path.open(newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for line_no, row in enumerate(reader, start=2):
                pk = (row.get("package_code") or "").strip()
                sk = (row.get("service_code") or "").strip()
                if not pk or not sk:
                    continue
                key = f"{pk}::{sk}"
                locs.setdefault(key, []).append((path.name, line_no))
    return [DupHit("package_item", k, v) for k, v in sorted(locs.items()) if len(v) > 1]


def find_duplicate_category_codes(data_dir: Path) -> list[DupHit]:
    """Unique ``code`` across ``categories.csv`` + ``subcategories.csv``."""
    locs: dict[str, list[tuple[str, int]]] = {}
    for fname in ("categories.csv", "subcategories.csv"):
        path = data_dir / fname
        if not path.is_file():
            continue
        with path.open(newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for line_no, row in enumerate(reader, start=2):
                code = (row.get("code") or "").strip()
                if not code:
                    continue
                locs.setdefault(code, []).append((fname, line_no))
    return [DupHit("category_code", k, v) for k, v in sorted(locs.items()) if len(v) > 1]


def find_all_duplicates(data_dir: Path) -> list[DupHit]:
    out: list[DupHit] = []
    out.extend(find_duplicate_category_codes(data_dir))
    out.extend(find_duplicate_service_codes(data_dir))
    out.extend(find_duplicate_package_keys(data_dir))
    out.extend(find_duplicate_package_item_keys(data_dir))
    return out


def remove_duplicate_service_rows(data_dir: Path) -> tuple[int, list[str]]:
    """
    For each duplicate ``code`` across ``services/*.csv``, keep the first occurrence
    (sorted file name, then row order) and drop later rows. Rewrites only files that change.

    Returns (rows_removed, log_lines).
    """
    svc_dir = data_dir / "services"
    files = sorted(svc_dir.glob("*.csv"))
    log: list[str] = []
    removed_total = 0

    seen_codes: set[str] = set()
    for path in files:
        with path.open(newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            fieldnames = list(reader.fieldnames or [])
            raw_rows = list(reader)

        kept: list[dict[str, str]] = []
        removed_here = 0
        for row in raw_rows:
            cells = {k: (v if v is not None else "") for k, v in row.items()}
            code = (cells.get("code") or "").strip()
            if code and code in seen_codes:
                removed_here += 1
                continue
            if code:
                seen_codes.add(code)
            kept.append(cells)

        if removed_here:
            removed_total += removed_here
            log.append(f"{path.name}: removed {removed_here} duplicate row(s) (by service code)")
            with path.open("w", newline="", encoding="utf-8") as fh:
                w = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore")
                w.writeheader()
                for row in kept:
                    w.writerow({k: row.get(k, "") for k in fieldnames})

    return removed_total, log
