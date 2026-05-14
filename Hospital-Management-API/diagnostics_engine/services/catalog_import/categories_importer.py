from __future__ import annotations

import logging
from pathlib import Path

from django.db import IntegrityError
from django.db.models import Q

from diagnostics_engine.models.catalog import DiagnosticCategory
from diagnostics_engine.services.catalog_import.exceptions import StrictImportError
from diagnostics_engine.services.catalog_import.import_stats import ImportRunResult
from diagnostics_engine.services.catalog_import.utils import (
    CsvRow,
    read_csv_rows,
    sort_rows_by_csv_ordering,
    parse_bool,
)
from diagnostics_engine.services.catalog_import.validators import duplicate_natural_keys, require_columns

logger = logging.getLogger(__name__)

ROOT_REQUIRED = ("ordering", "code", "name", "is_active")
SUB_REQUIRED = ("ordering", "code", "name", "parent_code", "is_active")


def _row_err(result: ImportRunResult, msg: str, *, strict: bool) -> None:
    result.errors.append(msg)
    result.stats.failed += 1
    logger.warning(msg)
    if strict:
        raise StrictImportError(msg)


def _category_snapshot(cat: DiagnosticCategory) -> tuple:
    parent_code = cat.parent.code if cat.parent_id else ""
    return (cat.name, cat.is_active, parent_code)


def sync_categories(
    *,
    data_dir: Path,
    categories_path: Path,
    subcategories_path: Path,
    dry_run: bool = False,
    strict: bool = False,
) -> ImportRunResult:
    """
    Import root categories then subcategories (CSV `ordering` is sort-only, not persisted).
    """
    result = ImportRunResult()
    roots = read_csv_rows(categories_path)
    subs = read_csv_rows(subcategories_path)

    # Header / column checks on first row of each file
    for _label, rows, req in (
        ("categories", roots, ROOT_REQUIRED),
        ("subcategories", subs, SUB_REQUIRED),
    ):
        if rows:
            try:
                require_columns(rows[0].cells.keys(), req, row_ref=rows[0].ref())
            except ValueError as exc:
                msg = str(exc)
                result.errors.append(msg)
                result.stats.failed += 1
                if strict:
                    raise StrictImportError(msg) from exc
                return result

    dup_msgs = duplicate_natural_keys([(r.ref(), r.get("code")) for r in roots + subs if r.get("code")])
    for msg in dup_msgs:
        _row_err(result, msg, strict=strict)
    if dup_msgs:
        return result

    roots = sort_rows_by_csv_ordering(roots)
    subs = sort_rows_by_csv_ordering(subs)

    def upsert_root(row: CsvRow) -> None:
        code = row.get("code")
        name = row.get("name")
        if not code:
            _row_err(result, f"{row.ref()}: missing code", strict=strict)
            return
        if not name:
            _row_err(result, f"{row.ref()}: missing name", strict=strict)
            return
        try:
            is_active = parse_bool(row.get("is_active"), row_ref=row.ref(), field="is_active")
        except ValueError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            return

        if DiagnosticCategory.objects.filter(~Q(code=code), name=name).exists():
            _row_err(
                result,
                f"{row.ref()}: name {name!r} already used by another category",
                strict=strict,
            )
            return

        existing = DiagnosticCategory.objects.filter(code=code).first()
        if dry_run:
            if not existing:
                result.stats.created += 1
            else:
                snap = _category_snapshot(existing)
                if snap == (name, is_active, ""):
                    result.stats.skipped += 1
                else:
                    result.stats.updated += 1
            return

        if existing:
            if _category_snapshot(existing) == (name, is_active, ""):
                result.stats.skipped += 1
                return
            existing.name = name
            existing.is_active = is_active
            existing.parent = None
            try:
                existing.save(update_fields=["name", "is_active", "parent", "updated_at"])
            except IntegrityError as exc:
                _row_err(result, f"{row.ref()}: {exc}", strict=strict)
                return
            result.stats.updated += 1
            logger.info("Updated category %s", code)
            return

        try:
            DiagnosticCategory.objects.create(
                code=code,
                name=name,
                is_active=is_active,
                parent=None,
            )
        except IntegrityError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            return
        result.stats.created += 1
        logger.info("Created category %s", code)

    for row in roots:
        upsert_root(row)

    # Codes in DB plus root codes from CSV (so dry-run can resolve subcategory parents before roots
    # are committed). Extended each pass with successfully processed subcategory codes.
    simulated_codes: set[str] = set(
        DiagnosticCategory.objects.filter(deleted_at__isnull=True).values_list("code", flat=True)
    )
    simulated_codes.update(r.get("code") for r in roots if r.get("code"))

    # Subcategories: resolve parent by code; multi-pass for deeper trees.
    pending = list(subs)
    max_rounds = len(pending) + 2
    for _ in range(max_rounds):
        if not pending:
            break
        progressed = False
        next_pending: list[CsvRow] = []
        for row in pending:
            code = row.get("code")
            name = row.get("name")
            parent_code = row.get("parent_code")
            if not code:
                _row_err(result, f"{row.ref()}: missing code", strict=strict)
                continue
            if not name:
                _row_err(result, f"{row.ref()}: missing name", strict=strict)
                continue
            if not parent_code:
                _row_err(result, f"{row.ref()}: missing parent_code for subcategory", strict=strict)
                continue
            try:
                is_active = parse_bool(row.get("is_active"), row_ref=row.ref(), field="is_active")
            except ValueError as exc:
                _row_err(result, f"{row.ref()}: {exc}", strict=strict)
                continue

            parent_obj = DiagnosticCategory.objects.filter(
                code=parent_code, deleted_at__isnull=True
            ).first()
            if not parent_obj and parent_code not in simulated_codes:
                next_pending.append(row)
                continue

            if DiagnosticCategory.objects.filter(~Q(code=code), name=name).exists():
                _row_err(
                    result,
                    f"{row.ref()}: name {name!r} already used by another category",
                    strict=strict,
                )
                progressed = True
                continue

            existing = DiagnosticCategory.objects.filter(code=code).first()
            if dry_run:
                if not existing:
                    result.stats.created += 1
                else:
                    snap = _category_snapshot(existing)
                    if snap == (name, is_active, parent_code):
                        result.stats.skipped += 1
                    else:
                        result.stats.updated += 1
                simulated_codes.add(code)
                progressed = True
                continue

            if existing:
                if _category_snapshot(existing) == (name, is_active, parent_code):
                    result.stats.skipped += 1
                    simulated_codes.add(code)
                    progressed = True
                    continue
                existing.name = name
                existing.is_active = is_active
                existing.parent = parent_obj
                try:
                    existing.save(update_fields=["name", "is_active", "parent", "updated_at"])
                except IntegrityError as exc:
                    _row_err(result, f"{row.ref()}: {exc}", strict=strict)
                    progressed = True
                    continue
                result.stats.updated += 1
                logger.info("Updated subcategory %s", code)
                simulated_codes.add(code)
            else:
                if parent_obj is None:
                    _row_err(
                        result,
                        f"{row.ref()}: parent category not in DB yet (code={parent_code!r}); "
                        f"check CSV order or parent_code",
                        strict=strict,
                    )
                    progressed = True
                    continue
                try:
                    DiagnosticCategory.objects.create(
                        code=code,
                        name=name,
                        is_active=is_active,
                        parent=parent_obj,
                    )
                except IntegrityError as exc:
                    _row_err(result, f"{row.ref()}: {exc}", strict=strict)
                    progressed = True
                    continue
                result.stats.created += 1
                logger.info("Created subcategory %s", code)
                simulated_codes.add(code)
            progressed = True

        pending = next_pending
        if not progressed and pending:
            for row in pending:
                msg = (
                    f"{row.ref()}: parent category code not found (or circular wait): "
                    f"{row.get('parent_code')!r}"
                )
                _row_err(result, msg, strict=strict)
            break

    return result
